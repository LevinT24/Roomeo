-- Check if the settlement was properly saved
SELECT 
    s.*,
    eg.name as group_name,
    payer.name as payer_name,
    receiver.name as receiver_name
FROM settlements s
LEFT JOIN expense_groups eg ON s.group_id = eg.id
LEFT JOIN users payer ON s.payer_id = payer.id  
LEFT JOIN users receiver ON s.receiver_id = receiver.id
WHERE s.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY s.created_at DESC;