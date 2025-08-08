-- ===============================
-- Splitwise Expense Sharing Feature
-- Database Schema Migration
-- ===============================

-- 1. Create expense_groups table (Main expense rooms/groups)
CREATE TABLE IF NOT EXISTS expense_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  split_type TEXT CHECK (split_type IN ('equal', 'custom')) NOT NULL DEFAULT 'equal',
  has_group_chat BOOLEAN DEFAULT FALSE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create expense_participants table (Track who owes what in each expense group)
CREATE TABLE IF NOT EXISTS expense_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES expense_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_owed DECIMAL(10,2) NOT NULL CHECK (amount_owed >= 0),
  amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
  is_settled BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_group_participant UNIQUE(group_id, user_id),
  CONSTRAINT valid_payment_amount CHECK (amount_paid <= amount_owed)
);

-- 3. Create settlements table (Track payment submissions and approvals)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES expense_groups(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'zelle', 'venmo', 'paypal', 'bank_transfer')) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_image TEXT, -- URL to uploaded payment proof
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT no_self_payment CHECK (payer_id != receiver_id)
);

-- 4. Create chat_participants table (Support group chats for expense groups)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_chat_participant UNIQUE(chat_id, user_id)
);

-- 5. Modify chats table to support group chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ===============================
-- Enable Row Level Security
-- ===============================

ALTER TABLE expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- ===============================
-- Create RLS Policies
-- ===============================

-- Expense Groups Policies
CREATE POLICY "Users can view expense groups they participate in" ON expense_groups
  FOR SELECT USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM expense_participants 
      WHERE expense_participants.group_id = expense_groups.id 
      AND expense_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expense groups" ON expense_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" ON expense_groups
  FOR UPDATE USING (auth.uid() = created_by);

-- Expense Participants Policies
CREATE POLICY "Users can view participants in their expense groups" ON expense_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expense_groups 
      WHERE expense_groups.id = expense_participants.group_id 
      AND (
        expense_groups.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM expense_participants ep2 
          WHERE ep2.group_id = expense_groups.id 
          AND ep2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group creators can add participants" ON expense_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_groups 
      WHERE expense_groups.id = group_id 
      AND expense_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Participants can update their own records" ON expense_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Settlements Policies
CREATE POLICY "Users can view settlements they're involved in" ON settlements
  FOR SELECT USING (
    auth.uid() = payer_id OR 
    auth.uid() = receiver_id OR
    EXISTS (
      SELECT 1 FROM expense_groups 
      WHERE expense_groups.id = settlements.group_id 
      AND expense_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create settlements for groups they participate in" ON settlements
  FOR INSERT WITH CHECK (
    auth.uid() = payer_id AND
    EXISTS (
      SELECT 1 FROM expense_participants 
      WHERE expense_participants.group_id = group_id 
      AND expense_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators and receivers can update settlements" ON settlements
  FOR UPDATE USING (
    auth.uid() = receiver_id OR
    EXISTS (
      SELECT 1 FROM expense_groups 
      WHERE expense_groups.id = settlements.group_id 
      AND expense_groups.created_by = auth.uid()
    )
  );

-- Chat Participants Policies
CREATE POLICY "Users can view participants in chats they're part of" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2 
      WHERE cp2.chat_id = chat_participants.chat_id 
      AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "System can add chat participants" ON chat_participants
  FOR INSERT WITH CHECK (true); -- Controlled by application logic

-- ===============================
-- Create Indexes for Performance
-- ===============================

-- Expense Groups Indexes
CREATE INDEX IF NOT EXISTS idx_expense_groups_created_by ON expense_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_groups_status ON expense_groups(status);
CREATE INDEX IF NOT EXISTS idx_expense_groups_created_at ON expense_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_expense_groups_chat_id ON expense_groups(chat_id);

-- Expense Participants Indexes
CREATE INDEX IF NOT EXISTS idx_expense_participants_group_id ON expense_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id ON expense_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_settled ON expense_participants(is_settled);
CREATE INDEX IF NOT EXISTS idx_expense_participants_group_user ON expense_participants(group_id, user_id);

-- Settlements Indexes
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer_id ON settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_receiver_id ON settlements(receiver_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at);

-- Chat Participants Indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- ===============================
-- Create Triggers
-- ===============================

-- Update timestamps
CREATE TRIGGER update_expense_groups_updated_at 
  BEFORE UPDATE ON expense_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- Utility Functions
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
  i INTEGER;
BEGIN
  -- Validate inputs
  IF array_length(p_participants, 1) < 2 THEN
    RAISE EXCEPTION 'At least 2 participants required';
  END IF;
  
  IF p_split_type = 'custom' AND (p_custom_amounts IS NULL OR array_length(p_custom_amounts, 1) != array_length(p_participants, 1)) THEN
    RAISE EXCEPTION 'Custom amounts must be provided for all participants';
  END IF;
  
  -- Validate custom amounts sum equals total
  IF p_split_type = 'custom' THEN
    IF (SELECT SUM(unnest) FROM unnest(p_custom_amounts)) != p_total_amount THEN
      RAISE EXCEPTION 'Sum of custom amounts must equal total amount';
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

-- Function to approve settlement
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

-- Function to get user's expense summary
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
  group_status TEXT
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
    eg.status
  FROM expense_groups eg
  JOIN expense_participants ep ON eg.id = ep.group_id
  JOIN users u ON eg.created_by = u.id
  WHERE ep.user_id = COALESCE(p_user_id, auth.uid())
  AND eg.status = 'active'
  ORDER BY eg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- Enable Real-time Subscriptions
-- ===============================

-- Enable real-time for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE expense_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;