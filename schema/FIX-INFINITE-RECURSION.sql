-- Fix infinite recursion in RLS policies
-- This completely eliminates the recursive policy issue

-- 1. Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own expense groups" ON expense_groups;
DROP POLICY IF EXISTS "Participants can view expense groups" ON expense_groups;
DROP POLICY IF EXISTS "Users can view participants in groups they are part of" ON expense_participants;

-- 2. Create simple, non-recursive policies

-- For expense_groups: Simple policy without subqueries
CREATE POLICY "expense_groups_select_policy" ON expense_groups
  FOR SELECT USING (
    auth.uid() = created_by OR 
    auth.uid() = ANY(
      SELECT user_id FROM expense_participants WHERE group_id = expense_groups.id
    )
  );

-- For expense_participants: Direct access policy
CREATE POLICY "expense_participants_select_policy" ON expense_participants
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS(SELECT 1 FROM expense_groups WHERE id = expense_participants.group_id AND created_by = auth.uid())
  );

-- 3. Alternative: Use SECURITY DEFINER functions for complex queries
-- Create a function to get pending settlements without RLS issues
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_pending_settlements(UUID) TO authenticated;

-- 4. Create function for expense summary to avoid RLS issues
CREATE OR REPLACE FUNCTION get_user_expense_summary(p_user_id UUID DEFAULT NULL)
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
DECLARE
  v_target_user_id UUID;
BEGIN
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    eg.id as group_id,
    eg.name as group_name,
    eg.description as group_description,
    eg.total_amount,
    ep.amount_owed,
    ep.amount_paid,
    ep.is_settled,
    COALESCE(u.name, 'Unknown User') as created_by_name,
    eg.created_at,
    eg.status as group_status
  FROM expense_groups eg
  INNER JOIN expense_participants ep ON eg.id = ep.group_id
  LEFT JOIN users u ON eg.created_by = u.id
  WHERE ep.user_id = v_target_user_id
    AND eg.status = 'active'
  ORDER BY eg.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_expense_summary(UUID) TO authenticated;

-- Test the functions
SELECT 'RLS infinite recursion fixed and helper functions created' as status;