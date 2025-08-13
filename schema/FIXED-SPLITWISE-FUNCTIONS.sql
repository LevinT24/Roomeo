-- ===============================
-- FIXED ROLLBACK SCRIPT  
-- This fixes the issues with the previous rollback
-- ===============================

-- 1. Drop problematic functions
DROP FUNCTION IF EXISTS get_expense_dashboard_data(UUID);
DROP FUNCTION IF EXISTS create_expense_group_debug(TEXT, DECIMAL, UUID[], TEXT, TEXT, DECIMAL[], BOOLEAN);
DROP FUNCTION IF EXISTS test_create_expense_group();
DROP FUNCTION IF EXISTS get_user_pending_settlements(UUID);
DROP FUNCTION IF EXISTS test_settlement_creation();
DROP FUNCTION IF EXISTS check_user_pending_settlements(UUID);
DROP FUNCTION IF EXISTS get_settlement_history_analytics(UUID);
DROP FUNCTION IF EXISTS send_expense_notification(UUID, TEXT, TEXT, JSONB, UUID);

-- 2. Restore the CORRECT create_expense_group function (matching original schema)
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
  -- Validate inputs (at least 1 participant for flexibility)
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
    VALUES (true, p_name || ' Chat', auth.uid())
    RETURNING id INTO v_chat_id;
  END IF;
  
  -- Create expense group
  INSERT INTO expense_groups (name, description, created_by, total_amount, split_type, has_group_chat, chat_id)
  VALUES (p_name, p_description, auth.uid(), p_total_amount, p_split_type, p_create_group_chat, v_chat_id)
  RETURNING id INTO v_group_id;
  
  -- Calculate equal split amount
  v_equal_amount := p_total_amount / array_length(p_participants, 1);
  
  -- Add participants (including creator if they're in the list)
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
  
  -- Add creator to group chat if created (even if not a participant)
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, auth.uid())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Restore the CORRECT get_expense_summary function WITH participants field
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

-- 4. Add the missing get_user_pending_settlements function
CREATE OR REPLACE FUNCTION get_user_pending_settlements(p_user_id UUID)
RETURNS TABLE (
  settlement_id UUID,
  group_id UUID,
  group_name TEXT,
  payer_id UUID,
  payer_name TEXT,
  receiver_id UUID,
  amount DECIMAL(10,2),
  payment_method TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  proof_image TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.group_id,
    eg.name,
    s.payer_id,
    u_payer.name,
    s.receiver_id,
    s.amount,
    s.payment_method,
    s.status,
    s.created_at,
    s.proof_image,
    s.notes
  FROM settlements s
  JOIN expense_groups eg ON s.group_id = eg.id
  JOIN users u_payer ON s.payer_id = u_payer.id
  WHERE s.receiver_id = p_user_id 
  AND s.status = 'pending'
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Restore the submit_settlement function
CREATE OR REPLACE FUNCTION submit_settlement(
  p_group_id UUID,
  p_amount DECIMAL(10,2),
  p_payment_method TEXT,
  p_proof_image TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_settlement_id UUID;
  v_receiver_id UUID;
  v_amount_owed DECIMAL(10,2);
BEGIN
  -- Get group creator (receiver)
  SELECT created_by INTO v_receiver_id
  FROM expense_groups
  WHERE id = p_group_id;
  
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Expense group not found';
  END IF;
  
  -- Verify user is participant and get amount owed
  SELECT amount_owed - amount_paid INTO v_amount_owed
  FROM expense_participants
  WHERE group_id = p_group_id AND user_id = auth.uid() AND NOT is_settled;
  
  IF v_amount_owed IS NULL THEN
    RAISE EXCEPTION 'User is not a participant or already settled';
  END IF;
  
  IF p_amount > v_amount_owed THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed amount owed';
  END IF;
  
  -- Create settlement record
  INSERT INTO settlements (group_id, payer_id, receiver_id, amount, payment_method, proof_image, notes)
  VALUES (p_group_id, auth.uid(), v_receiver_id, p_amount, p_payment_method, p_proof_image, p_notes)
  RETURNING id INTO v_settlement_id;
  
  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Restore the approve_settlement function
CREATE OR REPLACE FUNCTION approve_settlement(
  p_settlement_id UUID,
  p_approved BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_settlement settlements%ROWTYPE;
  v_remaining_owed DECIMAL(10,2);
BEGIN
  -- Get settlement details
  SELECT * INTO v_settlement
  FROM settlements
  WHERE id = p_settlement_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found or already processed';
  END IF;
  
  -- Verify user is the receiver or group creator
  IF auth.uid() != v_settlement.receiver_id AND 
     NOT EXISTS (SELECT 1 FROM expense_groups WHERE id = v_settlement.group_id AND created_by = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized to approve this settlement';
  END IF;
  
  -- Update settlement status
  UPDATE settlements
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END
  WHERE id = p_settlement_id;
  
  -- If approved, update participant balance
  IF p_approved THEN
    UPDATE expense_participants
    SET amount_paid = amount_paid + v_settlement.amount,
        is_settled = (amount_paid + v_settlement.amount >= amount_owed)
    WHERE group_id = v_settlement.group_id AND user_id = v_settlement.payer_id;
    
    -- Check if group is fully settled
    UPDATE expense_groups
    SET status = 'settled'
    WHERE id = v_settlement.group_id
    AND NOT EXISTS (
      SELECT 1 FROM expense_participants
      WHERE group_id = v_settlement.group_id AND NOT is_settled
    );
  END IF;
  
  RETURN p_approved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Restore the mark_participant_payment function
CREATE OR REPLACE FUNCTION mark_participant_payment(
  p_group_id UUID,
  p_user_id UUID,
  p_mark_as_paid BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_creator_id UUID;
  v_amount_owed DECIMAL(10,2);
BEGIN
  -- Get group creator
  SELECT created_by INTO v_creator_id
  FROM expense_groups
  WHERE id = p_group_id;
  
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Expense group not found';
  END IF;
  
  -- Verify the caller is the creator
  IF auth.uid() != v_creator_id THEN
    RAISE EXCEPTION 'Only the group creator can mark participant payments';
  END IF;
  
  -- Get participant's amount owed
  SELECT amount_owed INTO v_amount_owed
  FROM expense_participants
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  IF v_amount_owed IS NULL THEN
    RAISE EXCEPTION 'User is not a participant in this group';
  END IF;
  
  -- Update participant's payment status
  IF p_mark_as_paid THEN
    -- Mark as fully paid
    UPDATE expense_participants
    SET amount_paid = amount_owed,
        is_settled = true
    WHERE group_id = p_group_id AND user_id = p_user_id;
  ELSE
    -- Mark as unpaid
    UPDATE expense_participants
    SET amount_paid = 0,
        is_settled = false
    WHERE group_id = p_group_id AND user_id = p_user_id;
  END IF;
  
  -- Check if group is fully settled
  IF p_mark_as_paid THEN
    UPDATE expense_groups
    SET status = 'settled'
    WHERE id = p_group_id
    AND NOT EXISTS (
      SELECT 1 FROM expense_participants
      WHERE group_id = p_group_id AND NOT is_settled
    );
  ELSE
    -- If marking as unpaid, ensure group is not settled
    UPDATE expense_groups
    SET status = 'active'
    WHERE id = p_group_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION create_expense_group(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_pending_settlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_settlement(UUID, DECIMAL(10,2), TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_settlement(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_participant_payment(UUID, UUID, BOOLEAN) TO authenticated;

-- 9. Ensure tables exist with correct structure
-- This is just verification - tables should already exist from original schema

-- Create missing update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT 'Fixed database functions restored successfully!' as status;