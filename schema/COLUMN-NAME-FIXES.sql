-- ===============================
-- COLUMN NAME FIXES - Match your existing table to your code expectations
-- Your table has lowercase names, but your code expects camelCase
-- ===============================

-- Fix column names to match what your TypeScript code expects
ALTER TABLE users RENAME COLUMN profilepicture TO profilePicture;
ALTER TABLE users RENAME COLUMN createdat TO createdAt;
ALTER TABLE users RENAME COLUMN updatedat TO updatedAt;
ALTER TABLE users RENAME COLUMN isverified TO isVerified;
ALTER TABLE users RENAME COLUMN usertype TO userType;

-- Verify the changes worked
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;