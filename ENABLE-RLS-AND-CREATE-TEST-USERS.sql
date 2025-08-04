-- First, enable RLS properly with correct policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies
DROP POLICY IF EXISTS "temp_allow_all_inserts" ON users;
DROP POLICY IF EXISTS "temp_allow_all_selects" ON users;
DROP POLICY IF EXISTS "temp_allow_all_updates" ON users;

CREATE POLICY "allow_insert_own_profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_select_own_profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "allow_update_own_profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id);

-- CRITICAL: Allow viewing all profiles for matching
CREATE POLICY "allow_select_all_for_matching" ON users
  FOR SELECT 
  USING (true);

-- Create some test users so you can see matches
-- (These are fake users just for testing)
INSERT INTO users (id, name, email, usertype, age, bio, location, preferences, profilepicture) VALUES
(
  gen_random_uuid(),
  'Test Roommate Seeker',
  'test1@example.com',
  'seeker',
  25,
  'Looking for a clean, quiet place to live. I work in tech and love cooking.',
  'San Francisco, CA',
  '{"smoking": false, "drinking": true, "vegetarian": false, "pets": true}',
  '/placeholder.svg'
),
(
  gen_random_uuid(),
  'Test Apartment Owner',
  'test2@example.com', 
  'provider',
  28,
  'I have a 2BR apartment in downtown and need a roommate. No smoking please!',
  'San Francisco, CA',
  '{"smoking": false, "drinking": false, "vegetarian": true, "pets": false}',
  '/placeholder.svg'
),
(
  gen_random_uuid(),
  'Another Seeker',
  'test3@example.com',
  'seeker', 
  23,
  'Student looking for affordable housing. Very clean and respectful.',
  'San Francisco, CA',
  '{"smoking": false, "drinking": false, "vegetarian": false, "pets": false}',
  '/placeholder.svg'
);

-- Check what users exist now
SELECT id, name, usertype, age FROM users;