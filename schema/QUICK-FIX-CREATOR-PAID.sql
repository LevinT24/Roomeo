-- ===============================
-- QUICK FIX: Creator showing $0.00 paid
-- This should fix the "You Paid: $0.00" issue immediately
-- ===============================

-- Check current state first
SELECT 
  eg.name as room_name,
  eg.total_amount,
  u.name as creator_name,
  ep.amount_owed as creator_share,
  ep.amount_paid as creator_currently_shows,
  ep.is_settled
FROM expense_groups eg
JOIN expense_participants ep ON eg.id = ep.group_id AND ep.user_id = eg.created_by
JOIN users u ON eg.created_by = u.id
ORDER BY eg.created_at DESC
LIMIT 5;

-- Fix: Set creator's amount_paid = total_amount they actually paid
UPDATE expense_participants 
SET 
  amount_paid = (
    SELECT total_amount 
    FROM expense_groups 
    WHERE id = expense_participants.group_id
  ),
  is_settled = true
WHERE user_id IN (
  SELECT created_by 
  FROM expense_groups 
  WHERE id = expense_participants.group_id
);

-- Verify the fix worked
SELECT 
  eg.name as room_name,
  eg.total_amount,
  u.name as creator_name,
  ep.amount_owed as creator_share,
  ep.amount_paid as creator_now_shows,
  ep.is_settled
FROM expense_groups eg
JOIN expense_participants ep ON eg.id = ep.group_id AND ep.user_id = eg.created_by
JOIN users u ON eg.created_by = u.id
ORDER BY eg.created_at DESC
LIMIT 5;