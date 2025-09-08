-- ===============================
-- CREATOR SHARE TRANSPARENCY FIX
-- Creator shows their share but is marked as already paid
-- ===============================

-- STEP 1: Clean up existing data first (remove old creator entries if any)
DELETE FROM expense_participants ep
WHERE ep.user_id IN (
  SELECT eg.created_by 
  FROM expense_groups eg 
  WHERE eg.id = ep.group_id
);

-- STEP 2: Drop existing functions to recreate them
DROP FUNCTION IF EXISTS create_expense_group CASCADE;
DROP FUNCTION IF EXISTS create_event_room CASCADE;
DROP FUNCTION IF EXISTS create_regular_room CASCADE;

-- STEP 3: Create FIXED create_expense_group function (includes creator with transparency)
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
  v_creator_share DECIMAL(10,2);
  v_current_user UUID;
  v_all_participants UUID[];
  v_total_participants INTEGER;
  i INTEGER;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Include creator in the total participant count
  v_all_participants := array_append(COALESCE(p_participants, ARRAY[]::UUID[]), v_current_user);
  v_total_participants := array_length(v_all_participants, 1);
  
  IF v_total_participants < 2 THEN
    RAISE EXCEPTION 'At least 2 people (including creator) required for expense sharing';
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
  
  -- Calculate creator's fair share
  IF p_split_type = 'equal' THEN
    v_creator_share := p_total_amount / v_total_participants;
  ELSE
    -- For custom split, creator gets the remaining amount
    v_creator_share := p_total_amount - (SELECT SUM(unnest) FROM unnest(COALESCE(p_custom_amounts, ARRAY[]::DECIMAL[])));
  END IF;
  
  -- Add creator as participant (shows share, marked as paid)
  INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
  VALUES (v_group_id, v_current_user, v_creator_share, p_total_amount, true);
  
  -- Add creator to group chat
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, v_current_user)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  -- Add other participants
  FOR i IN 1..array_length(p_participants, 1) LOOP
    v_participant_id := p_participants[i];
    
    -- Skip if somehow creator is in participants list
    IF v_participant_id = v_current_user THEN
      CONTINUE;
    END IF;
    
    IF p_split_type = 'equal' THEN
      v_amount_owed := p_total_amount / v_total_participants;
    ELSE
      v_amount_owed := p_custom_amounts[i];
    END IF;
    
    INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
    VALUES (v_group_id, v_participant_id, v_amount_owed, 0, false);
    
    -- Add to group chat
    IF v_chat_id IS NOT NULL THEN
      INSERT INTO chat_participants (chat_id, user_id)
      VALUES (v_chat_id, v_participant_id)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create FIXED create_event_room function (includes creator with transparency)
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
  v_total_people INTEGER;
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

  -- Create expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, event_id, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, 'equal', p_event_id, 'active')
  RETURNING id INTO v_room_id;

  -- Get all participants INCLUDING creator (for transparent sharing)
  WITH all_people AS (
    -- Event members (including creator)
    SELECT em.user_id 
    FROM event_members em 
    WHERE em.event_id = p_event_id
    UNION
    -- Additional selected friends
    SELECT unnest(COALESCE(p_selected_friends, ARRAY[]::UUID[])) as user_id
  )
  SELECT array_agg(user_id) INTO v_all_participants
  FROM all_people;

  v_total_people := array_length(v_all_participants, 1);
  
  IF v_total_people = 0 THEN
    RAISE EXCEPTION 'No participants found for expense room';
  END IF;
  
  v_amount_per_person := p_total_amount / v_total_people;

  -- Add each person including creator
  FOREACH v_participant IN ARRAY v_all_participants
  LOOP
    IF v_participant = v_current_user THEN
      -- Creator: shows share but marked as paid
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (v_room_id, v_participant, v_amount_per_person, p_total_amount, true);
    ELSE
      -- Other participants: show share and amount owed
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (v_room_id, v_participant, v_amount_per_person, 0, false);
    END IF;
  END LOOP;

  RETURN v_room_id;
END
$$;

-- STEP 5: Create FIXED create_regular_room function (includes creator with transparency)
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
  v_all_participants UUID[];
  v_total_people INTEGER;
BEGIN
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, status)
  VALUES (p_name, p_description, v_current_user, p_total_amount, p_split_type, 'active')
  RETURNING id INTO v_room_id;

  -- Include creator in the participant list
  v_all_participants := array_append(COALESCE(p_participants, ARRAY[]::UUID[]), v_current_user);
  v_total_people := array_length(v_all_participants, 1);

  IF v_total_people < 2 THEN
    RAISE EXCEPTION 'At least 2 people required for expense sharing';
  END IF;

  -- Add all participants including creator
  FOR i IN 1..array_length(v_all_participants, 1) LOOP
    v_participant := v_all_participants[i];
    
    IF p_split_type = 'equal' THEN
      v_amount_owed := p_total_amount / v_total_people;
    ELSIF p_split_type = 'custom' AND p_custom_amounts IS NOT NULL THEN
      IF v_participant = v_current_user THEN
        -- Creator gets remaining amount in custom split
        v_amount_owed := p_total_amount - (SELECT SUM(unnest) FROM unnest(p_custom_amounts));
      ELSE
        -- Find this participant's position in original array
        FOR j IN 1..array_length(p_participants, 1) LOOP
          IF p_participants[j] = v_participant THEN
            v_amount_owed := p_custom_amounts[j];
            EXIT;
          END IF;
        END LOOP;
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid split configuration';
    END IF;
    
    IF v_participant = v_current_user THEN
      -- Creator: shows share but marked as paid
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (v_room_id, v_participant, v_amount_owed, p_total_amount, true);
    ELSE
      -- Other participants: show share and amount owed
      INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
      VALUES (v_room_id, v_participant, v_amount_owed, 0, false);
    END IF;
  END LOOP;

  RETURN v_room_id;
END
$$;

-- STEP 6: Grant permissions
GRANT EXECUTE ON FUNCTION create_expense_group(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION create_event_room(TEXT, DECIMAL(10,2), UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_regular_room(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;

-- STEP 7: Update existing expense rooms to include creator transparency
-- This adds creators to existing rooms with proper transparency
INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
SELECT 
  eg.id as group_id,
  eg.created_by as user_id,
  -- Calculate creator's fair share
  CASE 
    WHEN eg.split_type = 'equal' THEN 
      eg.total_amount / (
        (SELECT COUNT(*) FROM expense_participants ep WHERE ep.group_id = eg.id) + 1
      )
    ELSE eg.total_amount -- For custom, assume creator covers difference
  END as amount_owed,
  eg.total_amount as amount_paid, -- Creator paid the full amount
  true as is_settled -- Creator is already settled
FROM expense_groups eg
WHERE eg.created_by NOT IN (
  SELECT ep.user_id 
  FROM expense_participants ep 
  WHERE ep.group_id = eg.id
)
ON CONFLICT (group_id, user_id) DO NOTHING;

-- STEP 8: Recalculate amounts for existing participants after adding creator
UPDATE expense_participants ep
SET amount_owed = eg.total_amount / (
  SELECT COUNT(*) FROM expense_participants ep2 WHERE ep2.group_id = eg.id
)
FROM expense_groups eg
WHERE ep.group_id = eg.id 
  AND eg.split_type = 'equal'
  AND ep.user_id != eg.created_by; -- Don't update creator's amount

-- STEP 9: Verification
SELECT 'Creator transparency fix applied!' as status;
SELECT 'Creators now show their fair share but are marked as paid' as explanation;
SELECT COUNT(*) as "Total expense rooms" FROM expense_groups;
SELECT COUNT(*) as "Creators included as participants" 
FROM expense_participants ep
JOIN expense_groups eg ON ep.group_id = eg.id
WHERE ep.user_id = eg.created_by;