-- ===============================
-- ENHANCED INVITES UI - ADDITIONAL FUNCTIONS
-- Run this after INVITES-SYSTEM-SETUP.sql
-- ===============================

-- 1. Function to get group members with invite status (for enhanced UI)
CREATE OR REPLACE FUNCTION get_group_members_and_invites(p_group_id UUID)
RETURNS TABLE(
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  invite_id UUID,
  invited_email TEXT,
  invited_phone TEXT,
  invite_status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  inviter_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Current members
    u.id as member_id,
    COALESCE(u.display_name, u.email) as member_name,
    u.email as member_email,
    ep.joined_at,
    -- Invite details (NULL for current members)
    NULL::UUID as invite_id,
    NULL::TEXT as invited_email,
    NULL::TEXT as invited_phone,
    NULL::TEXT as invite_status,
    NULL::TIMESTAMP WITH TIME ZONE as expires_at,
    NULL::TEXT as inviter_name
  FROM expense_participants ep
  JOIN users u ON ep.user_id = u.id
  WHERE ep.group_id = p_group_id
  
  UNION ALL
  
  SELECT
    -- Pending invites
    NULL::UUID as member_id,
    NULL::TEXT as member_name,
    NULL::TEXT as member_email,
    NULL::TIMESTAMP WITH TIME ZONE as joined_at,
    -- Invite details
    i.id as invite_id,
    i.invited_email,
    i.invited_phone,
    i.status as invite_status,
    i.expires_at,
    COALESCE(inviter.display_name, inviter.email) as inviter_name
  FROM invites i
  JOIN users inviter ON i.inviter_id = inviter.id
  WHERE i.group_id = p_group_id
  AND i.status = 'pending'
  AND i.expires_at > NOW()
  
  ORDER BY joined_at ASC NULLS LAST, expires_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get group summary with counts
CREATE OR REPLACE FUNCTION get_group_summary(p_group_id UUID)
RETURNS TABLE(
  group_name TEXT,
  total_members INTEGER,
  pending_invites INTEGER,
  expired_invites INTEGER,
  is_user_owner BOOLEAN
) AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user (if any)
  current_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    eg.name as group_name,
    (SELECT COUNT(*)::INTEGER FROM expense_participants WHERE group_id = p_group_id) as total_members,
    (SELECT COUNT(*)::INTEGER FROM invites WHERE group_id = p_group_id AND status = 'pending' AND expires_at > NOW()) as pending_invites,
    (SELECT COUNT(*)::INTEGER FROM invites WHERE group_id = p_group_id AND status = 'expired') as expired_invites,
    (eg.created_by = current_user_id) as is_user_owner
  FROM expense_groups eg
  WHERE eg.id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to check if user can view group details
CREATE OR REPLACE FUNCTION can_user_access_group(p_group_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Use provided user_id or current auth user
  user_id := COALESCE(p_user_id, auth.uid());
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is a member of the group
  RETURN EXISTS (
    SELECT 1 FROM expense_participants 
    WHERE group_id = p_group_id 
    AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get invite analytics for group owners
CREATE OR REPLACE FUNCTION get_invite_analytics(p_group_id UUID)
RETURNS TABLE(
  total_invites_sent INTEGER,
  accepted_invites INTEGER,
  pending_invites INTEGER,
  expired_invites INTEGER,
  acceptance_rate NUMERIC,
  most_recent_invite TIMESTAMP WITH TIME ZONE,
  invites_by_method JSONB
) AS $$
BEGIN
  -- Verify user can access this group
  IF NOT can_user_access_group(p_group_id) THEN
    RAISE EXCEPTION 'Access denied to group analytics';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_invites_sent,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END)::INTEGER as accepted_invites,
    COUNT(CASE WHEN status = 'pending' AND expires_at > NOW() THEN 1 END)::INTEGER as pending_invites,
    COUNT(CASE WHEN status = 'expired' OR (status = 'pending' AND expires_at <= NOW()) THEN 1 END)::INTEGER as expired_invites,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / COUNT(*), 2)
      ELSE 0 
    END as acceptance_rate,
    MAX(created_at) as most_recent_invite,
    jsonb_build_object(
      'email', COUNT(CASE WHEN invited_email IS NOT NULL THEN 1 END),
      'whatsapp', COUNT(CASE WHEN invited_phone IS NOT NULL THEN 1 END)
    ) as invites_by_method
  FROM invites 
  WHERE group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create indexes for better performance on the new queries
CREATE INDEX IF NOT EXISTS idx_expense_participants_group_joined ON expense_participants(group_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_invites_group_status_expires ON invites(group_id, status, expires_at);

-- 6. Create a view for easy group member + invite status queries
CREATE OR REPLACE VIEW group_status_view AS
SELECT 
  eg.id as group_id,
  eg.name as group_name,
  eg.created_by as owner_id,
  (SELECT COUNT(*) FROM expense_participants WHERE group_id = eg.id) as member_count,
  (SELECT COUNT(*) FROM invites WHERE group_id = eg.id AND status = 'pending' AND expires_at > NOW()) as pending_invite_count,
  (SELECT COUNT(*) FROM invites WHERE group_id = eg.id AND status = 'accepted') as accepted_invite_count,
  eg.created_at,
  eg.updated_at
FROM expense_groups eg;

-- Grant access to the view
GRANT SELECT ON group_status_view TO authenticated;

-- 7. RLS policy for the new view
ALTER VIEW group_status_view SET (security_barrier = true);
CREATE POLICY "Users can view groups they participate in" ON group_status_view
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expense_participants 
      WHERE expense_participants.group_id = group_status_view.group_id 
      AND expense_participants.user_id = auth.uid()
    )
  );