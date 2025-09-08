-- ===============================
-- FIX CREATOR AMOUNT PAID ISSUE  
-- Creator should show amount_paid = total_amount
-- ===============================

-- Update existing expense rooms where creator shows $0.00 paid
-- Set creator's amount_paid to total_amount (what they actually paid)
UPDATE expense_participants ep
SET amount_paid = eg.total_amount,
    is_settled = true
FROM expense_groups eg
WHERE ep.group_id = eg.id 
  AND ep.user_id = eg.created_by  -- Only update creators
  AND ep.amount_paid = 0;  -- Only if they're showing $0.00

-- Verification query
SELECT 
  eg.name as expense_name,
  eg.total_amount,
  ep.amount_owed as creator_share,
  ep.amount_paid as creator_paid,
  ep.is_settled
FROM expense_groups eg
JOIN expense_participants ep ON eg.id = ep.group_id
WHERE ep.user_id = eg.created_by  -- Creators only
ORDER BY eg.created_at DESC
LIMIT 10;