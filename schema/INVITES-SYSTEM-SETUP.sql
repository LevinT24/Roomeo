-- ===============================
-- ROOMIO INVITE SYSTEM SETUP
-- Creates invites table and RLS policies
-- ===============================

-- 1. Create the invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_token TEXT UNIQUE NOT NULL,
  group_id UUID REFERENCES expense_groups(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT,
  invited_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  custom_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_group_id ON invites(group_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);

-- 3. Enable Row Level Security
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- View: Group members can see invites for their groups
CREATE POLICY "view_group_invites" ON invites FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expense_participants ep 
    WHERE ep.group_id = invites.group_id 
    AND ep.user_id = auth.uid()
  )
);

-- Create: Only group members can create invites
CREATE POLICY "create_group_invites" ON invites FOR INSERT WITH CHECK (
  auth.uid() = inviter_id AND
  EXISTS (
    SELECT 1 FROM expense_participants ep 
    WHERE ep.group_id = group_id 
    AND ep.user_id = auth.uid()
  )
);

-- Update: Only service role can mark as accepted/expired (security)
CREATE POLICY "service_update_invites" ON invites FOR UPDATE USING (
  auth.role() = 'service_role'
);

-- 5. Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_invite_token() RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to clean up expired invites (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_invites() RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE invites 
  SET status = 'expired', updated_at = NOW() 
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Create helper function to validate invite tokens (used by API)
CREATE OR REPLACE FUNCTION validate_invite_token(token TEXT) 
RETURNS TABLE(
  is_valid BOOLEAN,
  group_id UUID,
  group_name TEXT,
  inviter_name TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (i.status = 'pending' AND i.expires_at > NOW()) as is_valid,
    i.group_id,
    eg.name as group_name,
    COALESCE(users.display_name, users.email) as inviter_name,
    i.status,
    i.expires_at
  FROM invites i
  JOIN expense_groups eg ON i.group_id = eg.id
  JOIN users ON i.inviter_id = users.id
  WHERE i.invite_token = token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create atomic function to accept invites (prevents race conditions)
CREATE OR REPLACE FUNCTION accept_invite_transaction(
  p_invite_id UUID,
  p_group_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Add user to expense_participants (if not already there)
  INSERT INTO expense_participants (group_id, user_id, amount_owed, amount_paid, is_settled)
  VALUES (p_group_id, p_user_id, 0, 0, false)
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  -- Mark invite as accepted
  UPDATE invites 
  SET status = 'accepted',
      accepted_by = p_user_id,
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_invite_id
  AND status = 'pending';
  
  -- Check if update actually happened (prevent race conditions)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite was already accepted or expired';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;