-- Fix creator payment logic - creators should not pay themselves
-- Migration: 14_fix_creator_payment_logic.sql

-- Drop existing functions
DROP FUNCTION IF EXISTS create_event_room CASCADE;
DROP FUNCTION IF EXISTS create_regular_room CASCADE;

-- Recreate create_event_room function WITHOUT creator as participant
CREATE OR REPLACE FUNCTION create_event_room(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_selected_friends UUID[], -- Friends selected in UI
  p_event_id UUID, -- Required for event rooms
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_current_user UUID;
  v_all_participants UUID[];
  v_participant UUID;
  v_amount_per_person DECIMAL(10,2);
  v_participant_count INTEGER := 0;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify event exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM event_members em 
    WHERE em.event_id = p_event_id AND em.user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'Access denied to event or event does not exist';
  END IF;

  -- Create the expense group (room) - creator is NOT a participant
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, 'equal', p_event_id, 'active')
  RETURNING id INTO v_room_id;

  RAISE NOTICE 'EVENT ROOM CREATED: ID=%, Name=%, Amount=%', v_room_id, p_name, p_total_amount;

  -- Get ONLY participants (excluding creator): event members + selected friends
  WITH unique_participants AS (
    -- All event members EXCEPT creator
    SELECT em.user_id 
    FROM event_members em 
    WHERE em.event_id = p_event_id 
      AND em.user_id != v_current_user  -- EXCLUDE CREATOR
    UNION
    -- Selected friends (if any)
    SELECT unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) as user_id
    WHERE unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) != v_current_user  -- EXCLUDE CREATOR
  )
  SELECT array_agg(user_id) INTO v_all_participants
  FROM unique_participants;

  -- Calculate amount per person (only among actual participants, not creator)
  v_participant_count := array_length(v_all_participants, 1);
  
  -- Handle case where there are no participants
  IF v_participant_count = 0 THEN
    RAISE EXCEPTION 'No participants found for expense room';
  END IF;
  
  v_amount_per_person := p_total_amount / v_participant_count;

  RAISE NOTICE 'PARTICIPANTS: Total=%, Amount each=% (Creator excluded)', v_participant_count, v_amount_per_person;

  -- Add each participant (creator is NOT included)
  FOREACH v_participant IN ARRAY v_all_participants
  LOOP
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_room_id, v_participant, v_amount_per_person, 0, false)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      amount_owed = v_amount_per_person,
      amount_paid = 0,
      is_settled = false;
  END LOOP;

  -- Return room ID
  RETURN v_room_id;
END
$$;

-- Recreate create_regular_room function WITHOUT creator as participant
CREATE OR REPLACE FUNCTION create_regular_room(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_participants UUID[],
  p_description TEXT DEFAULT NULL,
  p_split_type TEXT DEFAULT 'equal',
  p_custom_amounts DECIMAL(10,2)[] DEFAULT NULL,
  p_create_group_chat BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_current_user UUID;
  v_participant UUID;
  v_amount_owed DECIMAL(10,2);
  v_participants_only UUID[];
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create expense group - creator is NOT a participant
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, 'active')
  RETURNING id INTO v_room_id;

  -- Get ONLY selected participants (exclude creator if somehow included)
  SELECT array_agg(user_id) INTO v_participants_only
  FROM (
    SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
    WHERE unnest(COALESCE(p_participants, ARRAY[]::UUID[])) != v_current_user  -- EXCLUDE CREATOR
  ) t;

  -- Handle case where there are no participants
  IF v_participants_only IS NULL OR array_length(v_participants_only, 1) = 0 THEN
    RAISE EXCEPTION 'No participants found for expense room';
  END IF;

  RAISE NOTICE 'REGULAR ROOM: Participants=%, Creator excluded', array_length(v_participants_only, 1);

  -- Add participants (creator is NOT included)
  FOR i IN 1..array_length(v_participants_only, 1) LOOP
    v_participant := v_participants_only[i];
    
    IF p_split_type = 'equal' THEN
      v_amount_owed := p_total_amount / array_length(v_participants_only, 1);
    ELSIF p_split_type = 'custom' AND p_custom_amounts IS NOT NULL THEN
      v_amount_owed := p_custom_amounts[i];
    ELSE
      RAISE EXCEPTION 'Invalid split configuration';
    END IF;
    
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_room_id, v_participant, v_amount_owed, 0, false);
  END LOOP;

  -- Return room ID
  RETURN v_room_id;
END
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_event_room TO authenticated;
GRANT EXECUTE ON FUNCTION create_regular_room TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_event_room IS 'Creates expense rooms within events - includes event members EXCEPT creator';
COMMENT ON FUNCTION create_regular_room IS 'Creates regular expense rooms - includes selected participants EXCEPT creator';