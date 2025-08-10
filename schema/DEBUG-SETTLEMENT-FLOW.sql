-- Debug Settlement Flow
-- This script helps debug why settlements aren't showing up as pending

-- 1. First, let's check if settlements are being created at all
SELECT 
  'Recent settlements in database:' as debug_info,
  s.id,
  s.group_id,
  s.payer_id,
  s.receiver_id,
  s.amount,
  s.status,
  s.created_at,
  eg.name as group_name,
  payer.name as payer_name,
  receiver.name as receiver_name
FROM settlements s
LEFT JOIN expense_groups eg ON s.group_id = eg.id
LEFT JOIN users payer ON s.payer_id = payer.id
LEFT JOIN users receiver ON s.receiver_id = receiver.id
ORDER BY s.created_at DESC
LIMIT 5;

-- 2. Check what the get_user_pending_settlements function returns
-- Run this with actual user IDs from your system
-- SELECT * FROM get_user_pending_settlements('your-main-user-id-here');

-- 3. Let's fix and enhance the get_user_pending_settlements function
CREATE OR REPLACE FUNCTION get_user_pending_settlements(p_user_id UUID DEFAULT NULL)
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
DECLARE
  v_target_user_id UUID;
BEGIN
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Debug logging
  RAISE NOTICE 'get_user_pending_settlements called for user: %', v_target_user_id;
  
  -- Check how many pending settlements exist for this user
  DECLARE
    v_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM settlements 
    WHERE status = 'pending' AND receiver_id = v_target_user_id;
    
    RAISE NOTICE 'Found % pending settlements for receiver %', v_count, v_target_user_id;
  END;
  
  RETURN QUERY
  SELECT 
    s.id as settlement_id,
    s.group_id,
    COALESCE(eg.name, 'Unknown Group') as group_name,
    s.payer_id,
    COALESCE(payer.name, 'Unknown User') as payer_name,
    s.receiver_id,
    s.amount,
    s.payment_method,
    s.status,
    s.created_at,
    s.proof_image,
    s.notes
  FROM settlements s
  LEFT JOIN expense_groups eg ON s.group_id = eg.id
  LEFT JOIN users payer ON s.payer_id = payer.id
  WHERE s.status = 'pending' 
    AND s.receiver_id = v_target_user_id
  ORDER BY s.created_at DESC;
  
  -- Log the results
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Returning % pending settlements', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_pending_settlements(UUID) TO authenticated;

-- 4. Create a simple test function to verify settlement creation
CREATE OR REPLACE FUNCTION test_settlement_creation()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
  v_settlement_count INTEGER;
BEGIN
  -- Count all settlements
  SELECT COUNT(*) INTO v_settlement_count FROM settlements;
  
  v_result := 'Total settlements in database: ' || v_settlement_count;
  
  -- Count pending settlements
  SELECT COUNT(*) INTO v_settlement_count FROM settlements WHERE status = 'pending';
  
  v_result := v_result || ', Pending settlements: ' || v_settlement_count;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_settlement_creation() TO authenticated;

-- 5. Enhanced logging for submit_settlement function
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
  v_payer_id UUID;
  v_participant_exists BOOLEAN;
  v_group_exists BOOLEAN;
BEGIN
  -- Get the current user ID
  v_payer_id := auth.uid();
  
  -- Debug logging
  RAISE NOTICE 'submit_settlement called - payer: %, group: %', v_payer_id, p_group_id;
  
  -- Verify group exists first (basic existence check)
  SELECT EXISTS(
    SELECT 1 FROM expense_groups WHERE id = p_group_id
  ) INTO v_group_exists;
  
  IF NOT v_group_exists THEN
    RAISE EXCEPTION 'Expense group with ID % does not exist', p_group_id;
  END IF;
  
  RAISE NOTICE 'Group exists: %', v_group_exists;
  
  -- Check if payer is a participant (bypass RLS with SECURITY DEFINER)
  SELECT EXISTS(
    SELECT 1 FROM expense_participants 
    WHERE group_id = p_group_id AND user_id = v_payer_id
  ) INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    RAISE EXCEPTION 'User % is not a participant in expense group %', v_payer_id, p_group_id;
  END IF;
  
  RAISE NOTICE 'User is participant: %', v_participant_exists;
  
  -- Get the group creator (who will receive the settlement)
  SELECT created_by INTO v_receiver_id
  FROM expense_groups
  WHERE id = p_group_id;
  
  -- This should not happen since we checked existence above, but just in case
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine group creator for group %', p_group_id;
  END IF;
  
  RAISE NOTICE 'Group creator (receiver): %', v_receiver_id;
  
  -- Verify payer is not the receiver (prevent self-payment)
  IF v_payer_id = v_receiver_id THEN
    RAISE EXCEPTION 'User % cannot submit settlement to themselves (group creator)', v_payer_id;
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than 0, got %', p_amount;
  END IF;
  
  -- Debug logging
  RAISE NOTICE 'Creating settlement - payer: %, receiver: %, amount: %', v_payer_id, v_receiver_id, p_amount;
  
  -- Create the settlement record
  INSERT INTO settlements (
    group_id,
    payer_id,
    receiver_id,
    amount,
    payment_method,
    status,
    proof_image,
    notes,
    created_at
  ) VALUES (
    p_group_id,
    v_payer_id,
    v_receiver_id,
    p_amount,
    p_payment_method,
    'pending',
    p_proof_image,
    p_notes,
    NOW()
  ) RETURNING id INTO v_settlement_id;
  
  RAISE NOTICE 'Settlement created successfully with ID: %, Status: pending', v_settlement_id;
  
  -- Verify the settlement was created
  DECLARE
    v_verification_status TEXT;
    v_verification_receiver UUID;
  BEGIN
    SELECT status, receiver_id INTO v_verification_status, v_verification_receiver
    FROM settlements 
    WHERE id = v_settlement_id;
    
    RAISE NOTICE 'Settlement verification - ID: %, Status: %, Receiver: %', 
      v_settlement_id, v_verification_status, v_verification_receiver;
  END;
  
  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION submit_settlement(UUID, DECIMAL(10,2), TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Debug functions created successfully. Check Supabase logs for detailed settlement creation info.' as status;