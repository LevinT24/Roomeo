-- ===============================
-- FIX RLS POLICIES - Allow user profile creation
-- The 401 error means RLS is blocking the INSERT operation
-- ===============================

-- 1. First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- 2. Drop all existing problematic policies and recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles for matching" ON users;
DROP POLICY IF EXISTS "Authenticated can insert into users" ON users;

-- 3. Create the correct policies that will allow user profile creation
-- CRITICAL: This allows authenticated users to insert their own profile
CREATE POLICY "Authenticated users can insert own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id);

-- CRITICAL: Allow viewing all profiles for the matching/discovery feature
CREATE POLICY "Users can view all profiles for matching" ON users
  FOR SELECT 
  USING (true);

-- 4. Verify RLS is enabled (should already be enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Test query to verify policies work (run this after the above)
-- This should return the current authenticated user's profile
-- SELECT id, name, email FROM users WHERE id = auth.uid();