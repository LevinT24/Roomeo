-- ===============================
-- COMPLETE CREATOR PAYMENT FIX
-- Removes creators from existing data and fixes all functions
-- ===============================

-- STEP 1: Clean up existing data - remove creators from expense_participants
-- This will remove all instances where creators are participants in their own rooms
DELETE FROM expense_participants ep
WHERE ep.user_id IN (
  SELECT eg.created_by 
  FROM expense_groups eg 
  WHERE eg.id = ep.group_id
);

-- STEP 2: Update expense amounts for remaining participants in affected groups
-- Recalculate amounts for groups that had creators removed
WITH affected_groups AS (
  SELECT DISTINCT eg.id, eg.total_amount,
    COUNT(ep.user_id) as participant_count
  FROM expense_groups eg
  JOIN expense_participants ep ON eg.id = ep.group_id
  WHERE eg.split_type = 'equal'
  GROUP BY eg.id, eg.total_amount
)
UPDATE expense_participants ep
SET amount_owed = ag.total_amount / ag.participant_count
FROM affected_groups ag
WHERE ep.group_id = ag.id;

-- STEP 3: Drop all expense creation functions to recreate them
DROP FUNCTION IF EXISTS create_expense_group CASCADE;
DROP FUNCTION IF EXISTS create_event_room CASCADE;
DROP FUNCTION IF EXISTS create_regular_room CASCADE;

-- STEP 4: Create the FIXED create_expense_group function (excludes creator)
CREATE OR REPLACE FUNCTION create_expense_group(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_participants UUID[],
  p_description TEXT DEFAULT NULL,
  p_split_type TEXT DEFAULT 'equal',
  p_custom_amounts DECIMAL(10,2)[] DEFAULT NULL,
  p_create_group_chat BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_chat_id UUID DEFAULT NULL;
  v_participant_id UUID;
  v_amount_owed DECIMAL(10,2);
  v_equal_amount DECIMAL(10,2);
  v_current_user UUID;
  v_participants_only UUID[];
  i INTEGER;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- CRITICAL: Filter out creator from participants list
  SELECT array_agg(user_id) INTO v_participants_only
  FROM (
    SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
    WHERE unnest(COALESCE(p_participants, ARRAY[]::UUID[])) != v_current_user
  ) t;
  
  -- Validate we have participants (excluding creator)
  IF v_participants_only IS NULL OR array_length(v_participants_only, 1) = 0 THEN
    RAISE EXCEPTION 'At least 1 participant (excluding creator) required';
  END IF;
  
  IF p_split_type = 'custom' AND (p_custom_amounts IS NULL OR array_length(p_custom_amounts, 1) != array_length(v_participants_only, 1)) THEN
    RAISE EXCEPTION 'Custom amounts must match number of participants (excluding creator)';
  END IF;
  
  -- Create group chat if requested
  IF p_create_group_chat THEN
    INSERT INTO chats (is_group, group_name, created_by)
    VALUES (true, p_name || ' Chat', v_current_user)
    RETURNING id INTO v_chat_id;
  END IF;
  
  -- Create expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, has_group_chat, chat_id)
  VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, p_create_group_chat, v_chat_id)
  RETURNING id INTO v_group_id;
  
  -- Calculate equal split amount (only among participants, NOT creator)
  v_equal_amount := p_total_amount / array_length(v_participants_only, 1);
  
  -- Add ONLY participants (creator is NEVER added)
  FOR i IN 1..array_length(v_participants_only, 1) LOOP
    v_participant_id := v_participants_only[i];
    
    IF p_split_type = 'equal' THEN
      v_amount_owed := v_equal_amount;
    ELSE
      v_amount_owed := p_custom_amounts[i];
    END IF;
    
    INSERT INTO expense_participants (group_id, user_id, amount_owed)
    VALUES (v_group_id, v_participant_id, v_amount_owed);
    
    -- Add to group chat if created
    IF v_chat_id IS NOT NULL THEN
      INSERT INTO chat_participants (chat_id, user_id)
      VALUES (v_chat_id, v_participant_id)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  -- Add creator to group chat (but NOT as participant)
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, v_current_user)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Recreate create_event_room function (already correct from migration)
CREATE OR REPLACE FUNCTION create_event_room(
  p_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_selected_friends UUID[],
  p_event_id UUID,
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
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify event access
  IF NOT EXISTS (
    SELECT 1 FROM event_members em 
    WHERE em.event_id = p_event_id AND em.user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'Access denied to event or event does not exist';
  END IF;

  -- Create expense group (creator is owner but NOT participant)
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, 'equal', p_event_id, 'active')
  RETURNING id INTO v_room_id;

  -- Get participants EXCLUDING creator
  WITH unique_participants AS (
    SELECT em.user_id 
    FROM event_members em 
    WHERE em.event_id = p_event_id 
      AND em.user_id != v_current_user  -- EXCLUDE CREATOR
    UNION
    SELECT unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) as user_id
    WHERE unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) != v_current_user  -- EXCLUDE CREATOR
  )
  SELECT array_agg(user_id) INTO v_all_participants
  FROM unique_participants;

  v_participant_count := array_length(v_all_participants, 1);
  
  IF v_participant_count = 0 THEN
    RAISE EXCEPTION 'No participants found for expense room';
  END IF;
  
  v_amount_per_person := p_total_amount / v_participant_count;

  -- Add each participant (creator NOT included)
  FOREACH v_participant IN ARRAY v_all_participants
  LOOP
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_room_id, v_participant, v_amount_per_person, 0, false)
    ON CONFLICT (group_id, user_id) DO UPDATE SET
      amount_owed = v_amount_per_person,
      amount_paid = 0,
      is_settled = false;
  END LOOP;

  RETURN v_room_id;
END
$$;

-- STEP 6: Recreate create_regular_room function (already correct from migration)
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
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create expense group (creator is owner but NOT participant)
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, 'active')
  RETURNING id INTO v_room_id;

  -- Get participants EXCLUDING creator
  SELECT array_agg(user_id) INTO v_participants_only
  FROM (
    SELECT unnest(COALESCE(p_participants, ARRAY[]::UUID[])) as user_id
    WHERE unnest(COALESCE(p_participants, ARRAY[]::UUID[])) != v_current_user  -- EXCLUDE CREATOR
  ) t;

  IF v_participants_only IS NULL OR array_length(v_participants_only, 1) = 0 THEN
    RAISE EXCEPTION 'No participants found for expense room';
  END IF;

  -- Add participants (creator NOT included)
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

  RETURN v_room_id;
END
$$;

-- STEP 7: Grant permissions
GRANT EXECUTE ON FUNCTION create_expense_group(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION create_event_room(TEXT, DECIMAL(10,2), UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_regular_room(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;

-- STEP 8: Verification queries
SELECT 'Cleaned up existing data and fixed all functions!' as status;
SELECT COUNT(*) as "Rooms with creator as participant (should be 0)" 
FROM expense_participants ep
JOIN expense_groups eg ON ep.group_id = eg.id
WHERE ep.user_id = eg.created_by;

SELECT 'COMPLETE CREATOR FIX APPLIED SUCCESSFULLY!' as final_status;