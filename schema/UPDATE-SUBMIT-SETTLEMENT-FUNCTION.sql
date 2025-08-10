-- Updated submit_settlement function with enhanced error handling and debugging
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
  
  -- Check if payer is a participant (bypass RLS with SECURITY DEFINER)
  SELECT EXISTS(
    SELECT 1 FROM expense_participants 
    WHERE group_id = p_group_id AND user_id = v_payer_id
  ) INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    RAISE EXCEPTION 'User % is not a participant in expense group %', v_payer_id, p_group_id;
  END IF;
  
  -- Get the group creator (who will receive the settlement)
  SELECT created_by INTO v_receiver_id
  FROM expense_groups
  WHERE id = p_group_id;
  
  -- This should not happen since we checked existence above, but just in case
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine group creator for group %', p_group_id;
  END IF;
  
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
  
  RAISE NOTICE 'Settlement created successfully with ID: %', v_settlement_id;
  
  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION submit_settlement(UUID, DECIMAL(10,2), TEXT, TEXT, TEXT) TO authenticated;

-- Test query to verify the function exists
SELECT 'submit_settlement function updated successfully' as status;