-- Fix ambiguous column reference in get_user_pending_settlements
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
  v_count INTEGER;
BEGIN
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Debug logging
  RAISE NOTICE 'get_user_pending_settlements called for user: %', v_target_user_id;
  
  -- Check how many pending settlements exist for this user
  SELECT COUNT(*) INTO v_count
  FROM settlements 
  WHERE settlements.status = 'pending' AND settlements.receiver_id = v_target_user_id;
  
  RAISE NOTICE 'Found % pending settlements for receiver %', v_count, v_target_user_id;
  
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
    s.status,  -- This is from settlements table (s.status)
    s.created_at,
    s.proof_image,
    s.notes
  FROM settlements s
  LEFT JOIN expense_groups eg ON s.group_id = eg.id
  LEFT JOIN users payer ON s.payer_id = payer.id
  WHERE s.status = 'pending'  -- Explicitly specify settlements.status
    AND s.receiver_id = v_target_user_id
  ORDER BY s.created_at DESC;
  
  -- Get final count
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Returning % pending settlements', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_pending_settlements(UUID) TO authenticated;

SELECT 'Fixed ambiguous column reference in get_user_pending_settlements' as status;