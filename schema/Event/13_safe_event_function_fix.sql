-- SAFE migration to fix Event room function
-- This approach is conservative and won't break existing functionality

-- First, let's create a new function with a different name to avoid conflicts
CREATE OR REPLACE FUNCTION create_expense_group_for_event(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_participants UUID[],
  p_description TEXT DEFAULT NULL,
  p_split_type TEXT DEFAULT 'equal',
  p_custom_amounts DECIMAL(10,2)[] DEFAULT NULL,
  p_create_group_chat BOOLEAN DEFAULT false,
  p_event_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_participant_id UUID;
  v_amount_owed DECIMAL(10,2);
  v_current_user UUID;
  v_all_participants UUID[];
  i INTEGER;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RAISE NOTICE 'Creating expense group: name=%, total_amount=%, participants=%, event_id=%', 
    p_name, p_total_amount, p_participants, p_event_id;
  
  -- Create the expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id)
  VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, p_event_id)
  RETURNING id INTO v_group_id;

  RAISE NOTICE 'Created expense group with ID: %', v_group_id;

  -- Build participants list safely
  IF p_event_id IS NOT NULL THEN
    -- Verify user has access to this event
    IF NOT EXISTS (
      SELECT 1 FROM event_members em 
      WHERE em.event_id = p_event_id AND em.user_id = v_current_user
    ) THEN
      RAISE EXCEPTION 'Access denied to event';
    END IF;
    
    -- Collect all participants: current user + event members + selected participants
    SELECT array_agg(DISTINCT user_id) INTO v_all_participants
    FROM (
      -- Always include current user
      SELECT v_current_user as user_id
      UNION ALL
      -- Include event members
      SELECT em.user_id 
      FROM event_members em 
      WHERE em.event_id = p_event_id
      UNION ALL
      -- Include selected participants
      SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
    ) participants;
  ELSE
    -- Non-event: just current user + selected participants
    SELECT array_agg(DISTINCT user_id) INTO v_all_participants
    FROM (
      SELECT v_current_user as user_id
      UNION ALL
      SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
    ) participants;
  END IF;

  RAISE NOTICE 'Final participants: %, count: %', v_all_participants, array_length(v_all_participants, 1);

  -- Validate we have participants
  IF v_all_participants IS NULL OR array_length(v_all_participants, 1) = 0 THEN
    -- Fallback: just add current user
    v_all_participants := ARRAY[v_current_user];
    RAISE NOTICE 'Fallback: adding only current user as participant';
  END IF;

  -- Add participants with amounts
  FOR i IN 1..array_length(v_all_participants, 1) LOOP
    v_participant_id := v_all_participants[i];
    
    -- Calculate amount - simple equal split
    v_amount_owed := p_total_amount / array_length(v_all_participants, 1);

    RAISE NOTICE 'Adding participant % with amount_owed: %', v_participant_id, v_amount_owed;

    -- Insert participant safely
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_group_id, v_participant_id, v_amount_owed, 0, false)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      amount_owed = EXCLUDED.amount_owed;
  END LOOP;

  -- Log final result
  DECLARE
    v_count INTEGER;
    v_total DECIMAL(10,2);
  BEGIN
    SELECT COUNT(*), SUM(amount_owed) INTO v_count, v_total
    FROM expense_participants WHERE group_id = v_group_id;
    
    RAISE NOTICE 'SUCCESS: Added % participants with total amount %', v_count, v_total;
  END;

  RETURN v_group_id;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION create_expense_group_for_event TO authenticated;

-- Now update the service to use this new function name
-- We'll keep the old function intact for safety