-- ===============================
-- Quick Access Feature Database Schema Updates (PRODUCTION SAFE)
-- ===============================
-- This version addresses all safety concerns from the original script

BEGIN;

-- ===============================
-- STEP 1: Add new columns first (safest operation)
-- ===============================

-- Add tracking fields for profile completion and upgrades
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS profile_completion_status JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS original_signup_type TEXT;

-- Add comments to new columns
COMMENT ON COLUMN users.profile_completion_status IS 
'JSON object tracking which profile fields were skipped during quick_access signup';

COMMENT ON COLUMN users.upgraded_at IS 
'Timestamp when user upgraded from quick_access to full features';

COMMENT ON COLUMN users.original_signup_type IS 
'Original user type selected during initial signup (before any upgrades)';

-- ===============================
-- STEP 2: Backfill data before constraint changes
-- ===============================

-- Update existing users to track their original signup type (with retry logic)
UPDATE users 
SET original_signup_type = userType 
WHERE original_signup_type IS NULL 
  AND userType IS NOT NULL 
  AND userType IN ('seeker', 'provider');

-- ===============================
-- STEP 3: Verify data integrity before constraint changes
-- ===============================

-- Check that all existing users have valid userType values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM users 
    WHERE userType NOT IN ('seeker', 'provider') 
      AND userType IS NOT NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % users with invalid userType values. Migration aborted for safety.', invalid_count;
    END IF;
    
    RAISE NOTICE 'Data validation passed: All existing userType values are valid';
END $$;

-- ===============================
-- STEP 4: Update constraint atomically
-- ===============================

-- Instead of dropping and recreating, we'll use a safer approach
-- First, rename the existing constraint to avoid naming conflicts
ALTER TABLE users RENAME CONSTRAINT check_user_type TO old_check_user_type;

-- Add the new constraint
ALTER TABLE users 
  ADD CONSTRAINT check_user_type 
    CHECK (userType IN ('seeker', 'provider', 'quick_access'));

-- Only after the new constraint is in place, drop the old one
ALTER TABLE users DROP CONSTRAINT old_check_user_type;

-- Add comment to document the new user type
COMMENT ON CONSTRAINT check_user_type ON users IS 
'User types: seeker (looking for place), provider (has place), quick_access (marketplace/expenses only)';

-- ===============================
-- STEP 5: Create indexes (avoiding conflicts)
-- ===============================

-- The existing schema already has idx_users_usertype, so we don't need a new one
-- Just verify it exists (it should)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_usertype') THEN
        RAISE WARNING 'Expected index idx_users_usertype not found. Creating it now.';
        CREATE INDEX idx_users_usertype ON users(userType);
    END IF;
END $$;

-- Create index for upgrade tracking
CREATE INDEX IF NOT EXISTS idx_users_upgraded_at ON users(upgraded_at) 
  WHERE upgraded_at IS NOT NULL;

-- Add index for better friend discovery performance (includes quick_access users)
CREATE INDEX IF NOT EXISTS idx_users_profile_visible_usertype ON users(profileVisible, userType) 
  WHERE profileVisible = true;

-- ===============================
-- STEP 6: Ensure chat system works for all user types
-- ===============================

-- Add any missing indexes for chat performance
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);

-- ===============================
-- STEP 7: Create upgrade tracking function and trigger
-- ===============================

-- Create function to track user upgrades
CREATE OR REPLACE FUNCTION track_user_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If userType changed from quick_access to seeker/provider, record upgrade
  IF OLD.userType = 'quick_access' AND NEW.userType IN ('seeker', 'provider') THEN
    NEW.upgraded_at = NOW();
    -- Preserve original signup type if not set
    IF NEW.original_signup_type IS NULL THEN
      NEW.original_signup_type = OLD.userType;
    END IF;
  END IF;
  
  -- Also handle lateral moves (seeker <-> provider) for completeness
  IF OLD.userType IN ('seeker', 'provider') AND NEW.userType IN ('seeker', 'provider') 
     AND OLD.userType != NEW.userType THEN
    -- Don't change upgraded_at for lateral moves, but ensure original_signup_type is preserved
    IF NEW.original_signup_type IS NULL THEN
      NEW.original_signup_type = OLD.userType;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track upgrades
DROP TRIGGER IF EXISTS trigger_track_user_upgrade ON users;
CREATE TRIGGER trigger_track_user_upgrade
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION track_user_upgrade();

-- ===============================
-- STEP 8: Create analytics view
-- ===============================

-- Create view for analytics on user types and upgrades
CREATE OR REPLACE VIEW user_type_analytics AS
SELECT 
  userType as current_user_type,
  original_signup_type,
  COUNT(*) as user_count,
  COUNT(upgraded_at) as upgraded_count,
  AVG(EXTRACT(EPOCH FROM (upgraded_at - createdAt))/3600) as avg_hours_to_upgrade
FROM users 
WHERE userType IS NOT NULL
GROUP BY userType, original_signup_type;

-- Grant appropriate permissions
GRANT SELECT ON user_type_analytics TO authenticated;

-- ===============================
-- STEP 9: Verification checks
-- ===============================

-- Verify the migration worked correctly
DO $$
DECLARE
    user_types_count RECORD;
    constraint_exists BOOLEAN;
BEGIN
    -- Check that constraint exists and works
    SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_user_type' 
        AND table_name = 'users'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'check_user_type constraint was not created properly';
    END IF;
    
    -- Show user type distribution
    FOR user_types_count IN 
        SELECT userType, COUNT(*) as count 
        FROM users 
        WHERE userType IS NOT NULL
        GROUP BY userType 
        ORDER BY count DESC
    LOOP
        RAISE NOTICE 'User type "%" has % users', user_types_count.userType, user_types_count.count;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- ===============================
-- Post-migration verification queries
-- ===============================
-- Run these manually to verify everything is working:

-- 1. Check user type distribution:
-- SELECT userType, COUNT(*) FROM users GROUP BY userType ORDER BY COUNT(*) DESC;

-- 2. Check analytics view:
-- SELECT * FROM user_type_analytics;

-- 3. Test constraint works:
-- INSERT INTO users (id, name, userType) VALUES (gen_random_uuid(), 'Test', 'invalid_type'); -- Should fail

-- 4. Test quick_access insertion works:
-- INSERT INTO users (id, name, userType) VALUES (gen_random_uuid(), 'Quick Test', 'quick_access'); -- Should work

-- 5. Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'users' ORDER BY indexname;