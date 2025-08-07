-- ===============================
-- URGENT RLS FIX - Run these commands in order
-- Error 42501 means RLS policies are blocking the insert
-- ===============================

-- 1. First, let's see what policies currently exist
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. TEMPORARY: Disable RLS to test if that's the issue
-- (We'll re-enable it after fixing policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Test insert without RLS (this should work now)
-- Try signing up again after running step 2

-- 4. If step 3 works, re-enable RLS and create proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles for matching" ON users;
DROP POLICY IF EXISTS "Authenticated can insert into users" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON users;

-- 6. Create the correct INSERT policy (this is the key one that's missing/broken)
CREATE POLICY "allow_insert_own_profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 7. Create other necessary policies
CREATE POLICY "allow_select_own_profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "allow_update_own_profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id);

-- 8. CRITICAL: Allow viewing all profiles for matching (needed for SwipePage)
CREATE POLICY "allow_select_all_for_matching" ON users
  FOR SELECT 
  USING (true);

-- 9. Verify policies were created correctly
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 10. Test the auth.uid() function to make sure it works
SELECT auth.uid() as current_user_id;