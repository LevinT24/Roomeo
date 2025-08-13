-- ===============================
-- DEBUG SCRIPT - Run after rebuilding tables
-- This will help us identify exactly what's wrong
-- ===============================

-- 1. Check if tables exist and have correct structure
SELECT 'TABLES CHECK:' as section;
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('expense_groups', 'expense_participants', 'settlements')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Check if functions exist
SELECT 'FUNCTIONS CHECK:' as section;
SELECT 
  p.proname as function_name,
  p.pronargs as arg_count,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'get_expense_summary',
  'create_expense_group',
  'get_user_pending_settlements'
)
ORDER BY p.proname;

-- 3. Check current user authentication
SELECT 'AUTHENTICATION CHECK:' as section;
SELECT 
  auth.uid() as current_user_id,
  CASE WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED' ELSE 'AUTHENTICATED' END as auth_status;

-- 4. Check if any expense groups exist
SELECT 'EXISTING EXPENSE GROUPS:' as section;
SELECT COUNT(*) as total_groups FROM expense_groups;
SELECT id, name, created_by, status, created_at FROM expense_groups ORDER BY created_at DESC LIMIT 5;

-- 5. Check if any participants exist
SELECT 'EXISTING PARTICIPANTS:' as section;
SELECT COUNT(*) as total_participants FROM expense_participants;
SELECT * FROM expense_participants LIMIT 5;

-- 6. Test the get_expense_summary function directly (with explicit user ID)
SELECT 'TESTING GET_EXPENSE_SUMMARY:' as section;
-- Replace this UUID with your actual user ID
SELECT * FROM get_expense_summary('90bc9115-0ba7-45f4-9b51-39bfaea30c01');

-- 7. Test creating a room manually to see if it works
SELECT 'TESTING ROOM CREATION:' as section;
-- This will test if the create_expense_group function works
-- Replace the UUIDs with actual user IDs from your users table
SELECT create_expense_group(
  'DEBUG TEST ROOM',
  100.00,
  ARRAY['90bc9115-0ba7-45f4-9b51-39bfaea30c01']::UUID[],
  'Test room for debugging',
  'equal'
) as new_group_id;

-- 8. After creating, check if it appears in the summary
SELECT 'AFTER CREATION - CHECK SUMMARY:' as section;
SELECT * FROM get_expense_summary('90bc9115-0ba7-45f4-9b51-39bfaea30c01');

-- 9. Check RLS policies
SELECT 'RLS POLICIES CHECK:' as section;
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('expense_groups', 'expense_participants')
AND schemaname = 'public';

-- 10. Check users table to ensure user exists
SELECT 'USERS CHECK:' as section;
SELECT id, name, email FROM users WHERE id = '90bc9115-0ba7-45f4-9b51-39bfaea30c01';