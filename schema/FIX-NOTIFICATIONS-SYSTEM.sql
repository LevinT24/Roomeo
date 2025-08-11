-- ===============================
-- Fix Notifications System (CORRECTED)
-- ===============================

-- 1. Add missing columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- 2. Update notifications table structure (ensure all columns exist)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB DEFAULT '{}',
  related_entity_id UUID, -- Can reference expense_group, settlement, etc.
  action_url TEXT -- Optional URL to navigate to
);

-- 3. Enable RLS (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications for users" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- 5. Create proper RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for users" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_id);

-- 7. Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 8. Create a function to properly send expense notifications
CREATE OR REPLACE FUNCTION send_expense_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB,
  p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    related_entity_id
  ) VALUES (
    p_user_id,
    'expense',
    p_title,
    p_message,
    p_data,
    p_related_entity_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update the submit_settlement function to send notifications
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
  v_group_name TEXT;
  v_payer_name TEXT;
  v_notification_id UUID;
BEGIN
  -- Get group creator (receiver) and group name
  SELECT created_by, name INTO v_receiver_id, v_group_name
  FROM expense_groups
  WHERE id = p_group_id;
  
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Expense group not found';
  END IF;
  
  -- Get payer name
  SELECT name INTO v_payer_name
  FROM users
  WHERE id = auth.uid();
  
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
  
  -- Send notification to the receiver (expense creator)
  PERFORM send_expense_notification(
    v_receiver_id,
    'Payment Submitted',
    v_payer_name || ' submitted a $' || p_amount::text || ' payment for "' || v_group_name || '"',
    jsonb_build_object(
      'settlement_id', v_settlement_id,
      'group_id', p_group_id,
      'amount', p_amount,
      'payer_id', auth.uid(),
      'payer_name', v_payer_name,
      'payment_method', p_payment_method
    ),
    v_settlement_id
  );
  
  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update the approve_settlement function to send notifications
CREATE OR REPLACE FUNCTION approve_settlement(
  p_settlement_id UUID,
  p_approved BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_settlement settlements%ROWTYPE;
  v_remaining_owed DECIMAL(10,2);
  v_group_name TEXT;
  v_approver_name TEXT;
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
  
  -- Get group name and approver name
  SELECT name INTO v_group_name FROM expense_groups WHERE id = v_settlement.group_id;
  SELECT name INTO v_approver_name FROM users WHERE id = auth.uid();
  
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
    
    -- Send approval notification to payer
    PERFORM send_expense_notification(
      v_settlement.payer_id,
      'Payment Approved',
      'Your $' || v_settlement.amount::text || ' payment for "' || v_group_name || '" was approved by ' || v_approver_name,
      jsonb_build_object(
        'settlement_id', p_settlement_id,
        'group_id', v_settlement.group_id,
        'amount', v_settlement.amount,
        'status', 'approved'
      ),
      p_settlement_id
    );
  ELSE
    -- Send rejection notification to payer
    PERFORM send_expense_notification(
      v_settlement.payer_id,
      'Payment Rejected',
      'Your $' || v_settlement.amount::text || ' payment for "' || v_group_name || '" was rejected by ' || v_approver_name,
      jsonb_build_object(
        'settlement_id', p_settlement_id,
        'group_id', v_settlement.group_id,
        'amount', v_settlement.amount,
        'status', 'rejected'
      ),
      p_settlement_id
    );
  END IF;
  
  RETURN p_approved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_expense_notification(UUID, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_settlement(UUID, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_settlement(UUID, BOOLEAN) TO authenticated;