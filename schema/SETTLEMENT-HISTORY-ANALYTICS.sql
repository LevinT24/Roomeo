-- Settlement History and Analytics Database Function
-- This creates a comprehensive function to fetch settlement history with analytics

CREATE OR REPLACE FUNCTION get_settlement_history_analytics(p_user_id UUID)
RETURNS TABLE (
  history JSONB,
  analytics JSONB
) AS $$
DECLARE
  v_history JSONB;
  v_analytics JSONB;
  v_total_paid DECIMAL(10,2) := 0;
  v_total_received DECIMAL(10,2) := 0;
  v_total_transactions INTEGER := 0;
  v_most_used_method TEXT := 'cash';
BEGIN
  -- Build settlement history
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'group_name', COALESCE(eg.name, 'Unknown Group'),
      'amount', s.amount,
      'payment_method', s.payment_method,
      'status', s.status,
      'created_at', s.created_at,
      'approved_at', s.approved_at,
      'type', CASE WHEN s.payer_id = p_user_id THEN 'sent' ELSE 'received' END,
      'payer_name', COALESCE(payer.name, 'Unknown User'),
      'receiver_name', COALESCE(receiver.name, 'Unknown User')
    )
    ORDER BY s.created_at DESC
  ) INTO v_history
  FROM settlements s
  LEFT JOIN expense_groups eg ON s.group_id = eg.id
  LEFT JOIN users payer ON s.payer_id = payer.id
  LEFT JOIN users receiver ON s.receiver_id = receiver.id
  WHERE s.payer_id = p_user_id OR s.receiver_id = p_user_id;

  -- Calculate analytics
  SELECT 
    COALESCE(SUM(CASE WHEN s.payer_id = p_user_id AND s.status = 'approved' THEN s.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.receiver_id = p_user_id AND s.status = 'approved' THEN s.amount ELSE 0 END), 0),
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END)
  INTO v_total_paid, v_total_received, v_total_transactions
  FROM settlements s
  WHERE s.payer_id = p_user_id OR s.receiver_id = p_user_id;

  -- Find most used payment method
  SELECT payment_method INTO v_most_used_method
  FROM settlements s
  WHERE (s.payer_id = p_user_id OR s.receiver_id = p_user_id) AND s.status = 'approved'
  GROUP BY payment_method
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Build analytics object
  SELECT jsonb_build_object(
    'total_paid', v_total_paid,
    'total_received', v_total_received,
    'total_transactions', v_total_transactions,
    'average_amount', CASE 
      WHEN v_total_transactions > 0 THEN (v_total_paid + v_total_received) / v_total_transactions 
      ELSE 0 
    END,
    'most_used_method', COALESCE(v_most_used_method, 'cash'),
    'monthly_summary', '[]'::jsonb  -- Simplified for now
  ) INTO v_analytics;

  -- Return results
  RETURN QUERY SELECT v_history, v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_settlement_history_analytics(UUID) TO authenticated;