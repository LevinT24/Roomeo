-- ===============================
-- Quick Access Feature Database Schema Updates
-- ===============================

-- Update user type enum to include quick_access
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS check_user_type;

ALTER TABLE users 
  ALTER COLUMN userType TYPE TEXT,
  ADD CONSTRAINT check_user_type 
    CHECK (userType IN ('seeker', 'provider', 'quick_access'));

-- Add tracking fields for profile completion and upgrades
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS profile_completion_status JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS original_signup_type TEXT;

-- Update existing users to track their original signup type
UPDATE users 
SET original_signup_type = userType 
WHERE original_signup_type IS NULL AND userType IS NOT NULL;

-- Create index for better performance on user type queries
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(userType);

-- Create index for upgrade tracking
CREATE INDEX IF NOT EXISTS idx_users_upgraded_at ON users(upgraded_at) WHERE upgraded_at IS NOT NULL;

-- Add index for better friend discovery performance (includes quick_access users)
CREATE INDEX IF NOT EXISTS idx_users_profile_visible_usertype ON users(profileVisible, userType) 
  WHERE profileVisible = true;

-- Ensure chat system works for all user types
-- Add any missing indexes for chat performance
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);

-- Add comment to document the new user type
COMMENT ON CONSTRAINT check_user_type ON users IS 
'User types: seeker (looking for place), provider (has place), quick_access (marketplace/expenses only)';

-- Add comments to new columns
COMMENT ON COLUMN users.profile_completion_status IS 
'JSON object tracking which profile fields were skipped during quick_access signup';

COMMENT ON COLUMN users.upgraded_at IS 
'Timestamp when user upgraded from quick_access to full features';

COMMENT ON COLUMN users.original_signup_type IS 
'Original user type selected during initial signup (before any upgrades)';

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track upgrades
DROP TRIGGER IF EXISTS trigger_track_user_upgrade ON users;
CREATE TRIGGER trigger_track_user_upgrade
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION track_user_upgrade();

-- Verify existing table constraints are compatible with quick_access users

-- Friend system compatibility (should already work)
-- friends table uses user_id and friend_id (both reference users.id)
-- friend_requests table uses sender_id and receiver_id (both reference users.id)
-- No user type restrictions needed

-- Chat system compatibility (should already work) 
-- chats table uses user1_id and user2_id (both reference users.id)
-- messages table uses sender_id (references users.id)
-- No user type restrictions needed

-- Marketplace compatibility (should already work)
-- marketplace_listings table uses seller_id (references users.id)
-- marketplace_messages table uses sender_id (references users.id)
-- No user type restrictions needed

-- Expense system compatibility (should already work)
-- expenses table uses creator_id (references users.id)
-- expense_participants table uses user_id (references users.id)
-- No user type restrictions needed

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

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO users (id, uid, email, name, userType, profile_completion_status, createdAt, updatedAt)
-- VALUES (
--   gen_random_uuid(),
--   gen_random_uuid(), 
--   'quickaccess@test.com',
--   'Quick Access Test User',
--   'quick_access',
--   '{"budget_skipped": true}',
--   NOW(),
--   NOW()
-- );

-- Verification queries to run after migration
-- SELECT userType, COUNT(*) FROM users GROUP BY userType;
-- SELECT * FROM user_type_analytics;
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE userType = 'quick_access' AND profileVisible = true;