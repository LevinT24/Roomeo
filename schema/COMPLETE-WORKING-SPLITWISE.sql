-- ===============================
-- COMPLETE WORKING SPLITWISE SCHEMA
-- Clean implementation that works with your frontend code
-- Run this AFTER deleting the old tables
-- ===============================

-- ===============================
-- 1. CREATE CORE TABLES
-- ===============================

-- Main expense groups/rooms table
CREATE TABLE expense_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  split_type TEXT CHECK (split_type IN ('equal', 'custom')) NOT NULL DEFAULT 'equal',
  has_group_chat BOOLEAN DEFAULT FALSE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants in each expense group
CREATE TABLE expense_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES expense_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount_owed DECIMAL(10,2) NOT NULL CHECK (amount_owed >= 0),
  amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
  is_settled BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_participant UNIQUE(group_id, user_id),
  CONSTRAINT valid_payment_amount CHECK (amount_paid <= amount_owed)
);

-- Settlement submissions and approvals
CREATE TABLE settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES expense_groups(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'zelle', 'venmo', 'paypal', 'bank_transfer')) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_image TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT no_self_payment CHECK (payer_id != receiver_id)
);

-- Chat participants for group chats (optional feature)
CREATE TABLE chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_chat_participant UNIQUE(chat_id, user_id)
);

-- ===============================
-- 2. ENABLE ROW LEVEL SECURITY
-- ===============================

ALTER TABLE expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 3. CREATE SIMPLE, NON-RECURSIVE RLS POLICIES
-- ===============================

-- Expense Groups Policies
CREATE POLICY "expense_groups_view" ON expense_groups
  FOR SELECT USING (
    created_by = auth.uid() 
    OR 
    id IN (SELECT group_id FROM expense_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "expense_groups_create" ON expense_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "expense_groups_update" ON expense_groups
  FOR UPDATE USING (created_by = auth.uid());

-- Expense Participants Policies  
CREATE POLICY "expense_participants_view" ON expense_participants
  FOR SELECT USING (
    user_id = auth.uid() 
    OR 
    group_id IN (SELECT id FROM expense_groups WHERE created_by = auth.uid())
  );

CREATE POLICY "expense_participants_create" ON expense_participants
  FOR INSERT WITH CHECK (
    group_id IN (SELECT id FROM expense_groups WHERE created_by = auth.uid())
  );

CREATE POLICY "expense_participants_update" ON expense_participants
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR 
    group_id IN (SELECT id FROM expense_groups WHERE created_by = auth.uid())
  );

-- Settlements Policies
CREATE POLICY "settlements_view" ON settlements
  FOR SELECT USING (
    payer_id = auth.uid() 
    OR 
    receiver_id = auth.uid() 
    OR
    group_id IN (SELECT id FROM expense_groups WHERE created_by = auth.uid())
  );

CREATE POLICY "settlements_create" ON settlements
  FOR INSERT WITH CHECK (payer_id = auth.uid());

CREATE POLICY "settlements_update" ON settlements
  FOR UPDATE USING (
    receiver_id = auth.uid() 
    OR
    group_id IN (SELECT id FROM expense_groups WHERE created_by = auth.uid())
  );

-- Chat Participants Policies
CREATE POLICY "chat_participants_view" ON chat_participants
  FOR SELECT USING (
    user_id = auth.uid() 
    OR
    chat_id IN (SELECT id FROM chats WHERE created_by = auth.uid())
  );

CREATE POLICY "chat_participants_manage" ON chat_participants
  FOR ALL WITH CHECK (true); -- Controlled by application logic

-- ===============================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ===============================

CREATE INDEX idx_expense_groups_created_by ON expense_groups(created_by);
CREATE INDEX idx_expense_groups_status ON expense_groups(status);
CREATE INDEX idx_expense_groups_created_at ON expense_groups(created_at);

CREATE INDEX idx_expense_participants_group_id ON expense_participants(group_id);
CREATE INDEX idx_expense_participants_user_id ON expense_participants(user_id);
CREATE INDEX idx_expense_participants_settled ON expense_participants(is_settled);
CREATE INDEX idx_expense_participants_group_user ON expense_participants(group_id, user_id);

CREATE INDEX idx_settlements_group_id ON settlements(group_id);
CREATE INDEX idx_settlements_payer_id ON settlements(payer_id);
CREATE INDEX idx_settlements_receiver_id ON settlements(receiver_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_created_at ON settlements(created_at);

CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

-- ===============================
-- 5. CREATE UTILITY FUNCTIONS
-- ===============================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for expense_groups
CREATE TRIGGER update_expense_groups_updated_at 
  BEFORE UPDATE ON expense_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- 6. CORE BUSINESS FUNCTIONS
-- ===============================

-- Function to create expense group with participants
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
  i INTEGER;
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
  
  -- Add all participants
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
    VALUES (v_chat_id, v_current_user)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's expense summary (WORKS WITH YOUR FRONTEND)
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
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user ID or auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided or user must be authenticated';
  END IF;
  
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
  WHERE ep.user_id = v_user_id
  AND eg.status = 'active'
  ORDER BY eg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending settlements
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
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided';
  END IF;
  
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

-- Function to submit settlement
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
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
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
  WHERE group_id = p_group_id AND user_id = v_current_user AND NOT is_settled;
  
  IF v_amount_owed IS NULL THEN
    RAISE EXCEPTION 'User is not a participant or already settled';
  END IF;
  
  IF p_amount > v_amount_owed THEN
    RAISE EXCEPTION 'Settlement amount cannot exceed amount owed';
  END IF;
  
  -- Create settlement record
  INSERT INTO settlements (group_id, payer_id, receiver_id, amount, payment_method, proof_image, notes)
  VALUES (p_group_id, v_current_user, v_receiver_id, p_amount, p_payment_method, p_proof_image, p_notes)
  RETURNING id INTO v_settlement_id;
  
  RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve settlement
CREATE OR REPLACE FUNCTION approve_settlement(
  p_settlement_id UUID,
  p_approved BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_settlement settlements%ROWTYPE;
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get settlement details
  SELECT * INTO v_settlement
  FROM settlements
  WHERE id = p_settlement_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found or already processed';
  END IF;
  
  -- Verify user is the receiver or group creator
  IF v_current_user != v_settlement.receiver_id AND 
     NOT EXISTS (SELECT 1 FROM expense_groups WHERE id = v_settlement.group_id AND created_by = v_current_user) THEN
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

-- Function to mark participant payment (creator only)
CREATE OR REPLACE FUNCTION mark_participant_payment(
  p_group_id UUID,
  p_user_id UUID,
  p_mark_as_paid BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  v_creator_id UUID;
  v_amount_owed DECIMAL(10,2);
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get group creator
  SELECT created_by INTO v_creator_id
  FROM expense_groups
  WHERE id = p_group_id;
  
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Expense group not found';
  END IF;
  
  -- Verify the caller is the creator
  IF v_current_user != v_creator_id THEN
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
    UPDATE expense_participants
    SET amount_paid = amount_owed,
        is_settled = true
    WHERE group_id = p_group_id AND user_id = p_user_id;
  ELSE
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
    UPDATE expense_groups
    SET status = 'active'
    WHERE id = p_group_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- 7. GRANT PERMISSIONS
-- ===============================

GRANT EXECUTE ON FUNCTION create_expense_group(TEXT, DECIMAL(10,2), UUID[], TEXT, TEXT, DECIMAL(10,2)[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_pending_settlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_settlement(UUID, DECIMAL(10,2), TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_settlement(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_participant_payment(UUID, UUID, BOOLEAN) TO authenticated;

-- ===============================
-- 8. ENABLE REAL-TIME SUBSCRIPTIONS
-- ===============================

ALTER PUBLICATION supabase_realtime ADD TABLE expense_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- ===============================
-- SETUP COMPLETE
-- ===============================

SELECT 'Complete Splitwise schema created successfully! Ready to use with your frontend.' as status;