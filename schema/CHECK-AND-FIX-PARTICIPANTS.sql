-- Check current state and fix the participant creation issue

-- 1. First, check if expense_participants table exists and has the right structure
SELECT 'EXPENSE_PARTICIPANTS TABLE STRUCTURE:' as info;
\d expense_participants;

-- 2. Check if any participants exist at all
SELECT 'TOTAL PARTICIPANTS COUNT:' as info;
SELECT COUNT(*) as total_participants FROM expense_participants;

-- 3. Check participants for the rooms we know exist
SELECT 'PARTICIPANTS FOR EXISTING ROOMS:' as info;
SELECT 
    ep.group_id,
    ep.user_id,
    ep.amount_owed,
    ep.amount_paid,
    ep.is_settled,
    eg.name as group_name
FROM expense_participants ep
RIGHT JOIN expense_groups eg ON ep.group_id = eg.id
ORDER BY eg.created_at DESC;

-- 4. Now let's fix the create_expense_group function to ensure participants are added
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
  i INTEGER;
  v_current_user UUID;
BEGIN
  -- Get current user
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate inputs
  IF array_length(p_participants, 1) < 1 THEN
    RAISE EXCEPTION 'At least 1 participant required';
  END IF;
  
  IF p_split_type = 'custom' AND (p_custom_amounts IS NULL OR array_length(p_custom_amounts, 1) != array_length(p_participants, 1)) THEN
    RAISE EXCEPTION 'Custom amounts must be provided for all participants';
  END IF;
  
  -- Validate custom amounts don't exceed total
  IF p_split_type = 'custom' THEN
    IF (SELECT SUM(unnest) FROM unnest(p_custom_amounts)) > p_total_amount THEN
      RAISE EXCEPTION 'Custom amounts cannot exceed the total amount';
    END IF;
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
  
  -- Calculate equal split amount
  v_equal_amount := p_total_amount / array_length(p_participants, 1);
  
  -- Add ALL participants (including creator if they're in the list)
  FOR i IN 1..array_length(p_participants, 1) LOOP
    v_participant_id := p_participants[i];
    
    -- Determine amount owed
    IF p_split_type = 'equal' THEN
      v_amount_owed := v_equal_amount;
    ELSE
      v_amount_owed := p_custom_amounts[i];
    END IF;
    
    -- Insert participant - THIS IS CRITICAL!
    INSERT INTO expense_participants (group_id, user_id, amount_owed)
    VALUES (v_group_id, v_participant_id, v_amount_owed);
    
    -- Add to group chat if created
    IF v_chat_id IS NOT NULL THEN
      INSERT INTO chat_participants (chat_id, user_id)
      VALUES (v_chat_id, v_participant_id)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  -- IMPORTANT: Also add creator as participant if they're not already in the participants list
  IF NOT (v_current_user = ANY(p_participants)) THEN
    INSERT INTO expense_participants (group_id, user_id, amount_owed)
    VALUES (v_group_id, v_current_user, 0);
  END IF;
  
  -- Add creator to group chat if created (even if not a participant)
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, v_current_user)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION create_expense_group(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;

SELECT 'Function updated to ensure participants are properly added!' as status;