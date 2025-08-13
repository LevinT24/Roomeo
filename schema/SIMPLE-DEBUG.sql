-- Run these queries ONE BY ONE and share the results for each

-- Query 1: Check if expense groups table has any data
SELECT COUNT(*) as total_expense_groups FROM expense_groups;

-- Query 2: Check if expense_participants table has any data  
SELECT COUNT(*) as total_participants FROM expense_participants;

-- Query 3: Check current authenticated user
SELECT auth.uid() as current_user_id;

-- Query 4: Check if the specific room exists
SELECT * FROM expense_groups WHERE id = '6e02483c-59e7-4aea-bc6d-8fe248e56b88';

-- Query 5: Check if participants exist for this room
SELECT * FROM expense_participants WHERE group_id = '6e02483c-59e7-4aea-bc6d-8fe248e56b88';

-- Query 6: Test get_expense_summary function
SELECT * FROM get_expense_summary(auth.uid());

-- Query 7: Check if you can see ANY expense groups
SELECT id, name, created_by, status FROM expense_groups LIMIT 5;