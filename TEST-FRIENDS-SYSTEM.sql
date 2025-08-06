-- ===============================
-- Test Friends System Setup
-- Run these queries to test your friends system
-- ===============================

-- 1. First, check if you have users in your database
SELECT id, email, name FROM users LIMIT 5;

-- 2. If you don't have test users, create some (replace with real emails if needed)
-- INSERT INTO users (id, email, name) 
-- SELECT 
--   gen_random_uuid(),
--   'test' || generate_series(1, 3) || '@example.com',
--   'Test User ' || generate_series(1, 3);

-- 3. Test the friends tables exist
SELECT COUNT(*) as friend_requests_count FROM friend_requests;
SELECT COUNT(*) as friendships_count FROM friendships;

-- 4. Test search functionality (this should match what your API does)
SELECT id, name, profilePicture, location 
FROM users 
WHERE name ILIKE '%test%' 
LIMIT 5;

-- 5. Test the accept_friend_request function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'accept_friend_request';

-- If everything works, your friends system is ready!