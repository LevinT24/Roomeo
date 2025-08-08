-- ===============================
-- Allow Single Participant for Testing
-- Updates the validation to require only 1 participant instead of 2
-- ===============================

-- Update the create_expense_group function to allow 1 participant
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
BEGIN
  -- Validate inputs (CHANGED: Now allows 1 participant for testing)
  IF array_length(p_participants, 1) < 1 THEN
    RAISE EXCEPTION 'At least 1 participant required';
  END IF;
  
  IF p_split_type = 'custom' AND (p_custom_amounts IS NULL OR array_length(p_custom_amounts, 1) != array_length(p_participants, 1)) THEN
    RAISE EXCEPTION 'Custom amounts must be provided for all participants';
  END IF;
  
  -- Validate custom amounts don't exceed total (CHANGED: Allow flexible custom amounts)
  IF p_split_type = 'custom' THEN
    IF (SELECT SUM(unnest) FROM unnest(p_custom_amounts)) > p_total_amount THEN
      RAISE EXCEPTION 'Custom amounts cannot exceed the total amount';
    END IF;
  END IF;
  
  -- Create group chat if requested
  IF p_create_group_chat THEN
    INSERT INTO chats (is_group, group_name, created_by)
    VALUES (true, p_name || ' Chat', auth.uid())
    RETURNING id INTO v_chat_id;
  END IF;
  
  -- Create expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, has_group_chat, chat_id)
  VALUES (p_name, p_description, auth.uid(), p_total_amount, p_split_type, p_create_group_chat, v_chat_id)
  RETURNING id INTO v_group_id;
  
  -- Calculate equal split amount (creator doesn't pay, only receives)
  v_equal_amount := p_total_amount / array_length(p_participants, 1);
  
  -- Add creator as participant (they don't owe money, just need to see the room)
  INSERT INTO expense_participants (group_id, user_id, amount_owed)
  VALUES (v_group_id, auth.uid(), 0);

  -- Add participants
  FOR i IN 1..array_length(p_participants, 1) LOOP
    v_participant_id := p_participants[i];
    
    -- Determine amount owed
    IF p_split_type = 'equal' THEN
      v_amount_owed := v_equal_amount;
    ELSE
      v_amount_owed := p_custom_amounts[i];
    END IF;
    
    -- Insert participant
    INSERT INTO expense_participants (group_id, user_id, amount_owed)
    VALUES (v_group_id, v_participant_id, v_amount_owed);
    
    -- Add to group chat if created
    IF v_chat_id IS NOT NULL THEN
      INSERT INTO chat_participants (chat_id, user_id)
      VALUES (v_chat_id, v_participant_id)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  -- Add creator to group chat if created
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, auth.uid())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS get_expense_summary(UUID);

-- Function to get user's expense summary with all participants
CREATE OR REPLACE FUNCTION get_expense_summary(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_description TEXT,
  total_amount DECIMAL(10,2),
  amount_owed DECIMAL(10,2),
  amount_paid DECIMAL(10,2),
  is_settled BOOLEAN,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  group_status TEXT,
  participants JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eg.id,
    eg.name,
    eg.description,
    eg.total_amount,
    ep.amount_owed,
    ep.amount_paid,
    ep.is_settled,
    u.name,
    eg.created_at,
    eg.status,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', ep2.user_id,
          'name', u2.name,
          'profile_picture', u2.profilepicture,
          'amount_owed', ep2.amount_owed,
          'amount_paid', ep2.amount_paid,
          'is_settled', ep2.is_settled,
          'is_creator', ep2.user_id = eg.created_by
        )
      )
      FROM expense_participants ep2
      JOIN users u2 ON ep2.user_id = u2.id
      WHERE ep2.group_id = eg.id
    ) as participants
  FROM expense_groups eg
  JOIN expense_participants ep ON eg.id = ep.group_id
  JOIN users u ON eg.created_by = u.id
  WHERE ep.user_id = COALESCE(p_user_id, auth.uid())
  AND eg.status = 'active'
  ORDER BY eg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix infinite recursion in RLS policies
-- Drop and recreate problematic policies with simpler logic

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view expense groups they participate in" ON expense_groups;
DROP POLICY IF EXISTS "Users can view participants in their expense groups" ON expense_participants;

-- Create simpler policies
CREATE POLICY "Users can view expense groups they participate in" ON expense_groups
  FOR SELECT USING (
    auth.uid() = created_by OR 
    id IN (
      SELECT group_id FROM expense_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view participants in their expense groups" ON expense_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT id FROM expense_groups 
      WHERE created_by = auth.uid()
    ) OR
    group_id IN (
      SELECT group_id FROM expense_participants 
      WHERE user_id = auth.uid()
    )
  );