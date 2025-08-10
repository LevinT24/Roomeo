-- Fix RLS Issues for Settlement Submission
-- This script safely fixes the RLS policies to prevent recursion and enable proper settlement functionality

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view expense groups they participate in" ON expense_groups;
DROP POLICY IF EXISTS "Users can view participants in their expense groups" ON expense_participants;

-- 2. Create simplified, non-recursive policies for expense_groups
CREATE POLICY "Users can view their own expense groups" ON expense_groups
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Participants can view expense groups" ON expense_groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM expense_participants 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Create simplified policy for expense_participants
CREATE POLICY "Users can view participants in groups they are part of" ON expense_participants
  FOR SELECT USING (
    user_id = auth.uid() OR 
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    ) OR
    group_id IN (
      SELECT group_id FROM expense_participants WHERE user_id = auth.uid()
    )
  );

-- 4. Enhanced submit_settlement function that works with RLS
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
BEGIN
  -- Get the current user ID
  v_payer_id := auth.uid();
  
  -- Check if payer is a participant (using SECURITY DEFINER to bypass RLS)
  SELECT EXISTS(
    SELECT 1 FROM expense_participants 
    WHERE group_id = p_group_id AND user_id = v_payer_id
  ) INTO v_participant_exists;
  
  IF NOT v_participant_exists THEN
    RAISE EXCEPTION 'You are not a participant in this expense group';
  END IF;
  
  -- Get the group creator (who will receive the settlement)
  -- Using SECURITY DEFINER to bypass RLS for system operations
  SELECT created_by INTO v_receiver_id
  FROM expense_groups
  WHERE id = p_group_id;
  
  -- Verify group exists
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Expense group not found';
  END IF;
  
  -- Verify payer is not the receiver (prevent self-payment)
  IF v_payer_id = v_receiver_id THEN
    RAISE EXCEPTION 'Cannot submit settlement to yourself';
  END IF;
  
  -- Create the settlement record
  INSERT INTO settlements (
    group_id,
    payer_id,
    receiver_id,
    amount,
    payment_method,
    status,
    proof_image,
    notes
  ) VALUES (
    p_group_id,
    v_payer_id,
    v_receiver_id,
    p_amount,
    p_payment_method,
    'pending',
    p_proof_image,
    p_notes
  ) RETURNING id INTO v_settlement_id;
  
  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION submit_settlement(UUID, DECIMAL(10,2), TEXT, TEXT, TEXT) TO authenticated;

-- 6. Add policy for settlements to ensure participants can access them
DROP POLICY IF EXISTS "Users can view settlements they're involved in" ON settlements;
CREATE POLICY "Users can view settlements they're involved in" ON settlements
  FOR SELECT USING (
    auth.uid() = payer_id OR 
    auth.uid() = receiver_id OR
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

-- 7. Ensure settlements can be inserted by participants
DROP POLICY IF EXISTS "Users can create settlements for groups they participate in" ON settlements;
CREATE POLICY "Users can create settlements for groups they participate in" ON settlements
  FOR INSERT WITH CHECK (
    auth.uid() = payer_id AND
    group_id IN (
      SELECT group_id FROM expense_participants WHERE user_id = auth.uid()
    )
  );

-- 8. Allow settlement updates by receivers and group creators
DROP POLICY IF EXISTS "Group creators and receivers can update settlements" ON settlements;
CREATE POLICY "Group creators and receivers can update settlements" ON settlements
  FOR UPDATE USING (
    auth.uid() = receiver_id OR
    group_id IN (
      SELECT id FROM expense_groups WHERE created_by = auth.uid()
    )
  );

-- Log completion
SELECT 'RLS policies fixed successfully for settlement functionality' as status;