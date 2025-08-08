-- Fix for pending settlements RLS issues
-- This creates a database function to safely fetch pending settlements

CREATE OR REPLACE FUNCTION get_pending_settlements(user_id_param UUID)
RETURNS TABLE (
  settlement_id UUID,
  group_name TEXT,
  payer_name TEXT,
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
    s.id as settlement_id,
    eg.name as group_name,
    u.name as payer_name,
    s.amount,
    s.payment_method,
    s.status,
    s.created_at,
    s.proof_image,
    s.notes
  FROM settlements s
  JOIN expense_groups eg ON s.group_id = eg.id
  JOIN users u ON s.payer_id = u.id
  WHERE s.status = 'pending' 
    AND s.receiver_id = user_id_param
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_settlements(UUID) TO authenticated;