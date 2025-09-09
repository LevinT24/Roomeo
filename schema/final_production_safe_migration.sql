-- ===============================
-- FINAL PRODUCTION SAFE Quick Access Migration (Fixed)
-- ===============================
-- Corrects information_schema query errors

BEGIN;

-- ===============================
-- STEP 1: Safety validation
-- ===============================

-- Verify we have exactly the expected users (6 total: 3 providers, 3 seekers)
DO $$
DECLARE
    total_users INTEGER;
    provider_count INTEGER;
    seeker_count INTEGER;
    invalid_usertype_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO provider_count FROM users WHERE usertype = 'provider';
    SELECT COUNT(*) INTO seeker_count FROM users WHERE usertype = 'seeker';
    SELECT COUNT(*) INTO invalid_usertype_count 
    FROM users WHERE usertype NOT IN ('provider', 'seeker') AND usertype IS NOT NULL;
    
    IF total_users != 6 THEN
        RAISE EXCEPTION 'Expected 6 users, found %. Migration aborted for safety.', total_users;
    END IF;
    
    IF provider_count != 3 OR seeker_count != 3 THEN
        RAISE EXCEPTION 'Expected 3 providers and 3 seekers, found % providers and % seekers. Migration aborted.', provider_count, seeker_count;
    END IF;
    
    IF invalid_usertype_count > 0 THEN
        RAISE EXCEPTION 'Found % users with invalid userType. Migration aborted for safety.', invalid_usertype_count;
    END IF;
    
    RAISE NOTICE '✅ Production data validated: 6 users (3 providers, 3 seekers)';
END $$;

-- ===============================
-- STEP 2: Add new columns (safest operation)
-- ===============================

-- Add tracking fields for profile completion and upgrades
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS profile_completion_status JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS original_signup_type TEXT;

-- Add helpful comments
COMMENT ON COLUMN users.profile_completion_status IS 
'JSON object tracking which profile fields were skipped during quick_access signup';

COMMENT ON COLUMN users.upgraded_at IS 
'Timestamp when user upgraded from quick_access to full features';

COMMENT ON COLUMN users.original_signup_type IS 
'Original user type selected during initial signup (before any upgrades)';

-- ===============================
-- STEP 3: Backfill existing production data
-- ===============================

-- Set original_signup_type for all existing users
UPDATE users 
SET original_signup_type = usertype 
WHERE original_signup_type IS NULL AND usertype IS NOT NULL;

-- Verify backfill worked
DO $$
DECLARE
    backfill_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backfill_count 
    FROM users WHERE original_signup_type IS NOT NULL;
    
    IF backfill_count != 6 THEN
        RAISE EXCEPTION 'Backfill failed. Expected 6 users with original_signup_type, found %', backfill_count;
    END IF;
    
    RAISE NOTICE '✅ Existing user data preserved: All 6 users have original_signup_type';
END $$;

-- ===============================
-- STEP 4: Update constraint safely (corrected query)
-- ===============================

DO $$
DECLARE
    constraint_name_found TEXT;
    constraint_count INTEGER;
    existing_check_clause TEXT;
BEGIN
    -- Find the actual userType constraint (CORRECTED QUERY)
    SELECT tc.constraint_name, cc.check_clause 
    INTO constraint_name_found, existing_check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'users' 
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause ILIKE '%usertype%'
        AND cc.check_clause ILIKE '%seeker%'
        AND cc.check_clause ILIKE '%provider%'
    LIMIT 1;
    
    -- Count constraints to ensure we found exactly one
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'users' 
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause ILIKE '%usertype%';
    
    -- Safety checks
    IF constraint_count = 0 THEN
        RAISE EXCEPTION 'No userType constraint found. Database structure unexpected.';
    END IF;
    
    IF constraint_count > 1 THEN
        RAISE EXCEPTION 'Multiple userType constraints found (%). Database structure unexpected.', constraint_count;
    END IF;
    
    IF constraint_name_found IS NULL THEN
        RAISE EXCEPTION 'Could not identify userType constraint name.';
    END IF;
    
    RAISE NOTICE '✅ Found constraint: % with check: %', constraint_name_found, existing_check_clause;
    
    -- Atomically replace the constraint
    -- Step 1: Add new constraint with temp name
    EXECUTE 'ALTER TABLE users ADD CONSTRAINT temp_usertype_constraint 
             CHECK (usertype IN (''seeker'', ''provider'', ''quick_access''))';
    
    -- Step 2: Drop old constraint  
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name_found);
    
    -- Step 3: Rename temp constraint to standard name
    EXECUTE 'ALTER TABLE users RENAME CONSTRAINT temp_usertype_constraint TO check_user_type';
    
    RAISE NOTICE '✅ Constraint updated: quick_access userType now allowed';
END $$;

-- Add helpful constraint comment
COMMENT ON CONSTRAINT check_user_type ON users IS 
'User types: seeker (looking for place), provider (has place), quick_access (marketplace/expenses only)';

-- ===============================
-- STEP 5: Create performance indexes
-- ===============================

-- Index for upgrade tracking (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_users_upgraded_at ON users(upgraded_at) 
  WHERE upgraded_at IS NOT NULL;

-- Index for profile visibility with userType (existing profilevisible column)
CREATE INDEX IF NOT EXISTS idx_users_profile_visible_usertype ON users(profilevisible, usertype) 
  WHERE profilevisible = true;

-- Ensure chat performance indexes exist
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);

RAISE NOTICE '✅ Performance indexes created';

-- ===============================
-- STEP 6: Create upgrade tracking system
-- ===============================

-- Function to automatically track user upgrades
CREATE OR REPLACE FUNCTION track_user_upgrade()
RETURNS TRIGGER AS $$
BEGIN
    -- Track upgrades from quick_access to full features
    IF OLD.usertype = 'quick_access' AND NEW.usertype IN ('seeker', 'provider') THEN
        NEW.upgraded_at = NOW();
        -- Preserve original signup type
        IF NEW.original_signup_type IS NULL THEN
            NEW.original_signup_type = OLD.usertype;
        END IF;
    END IF;
    
    -- Handle lateral moves (seeker <-> provider) while preserving original type
    IF OLD.usertype IN ('seeker', 'provider') AND NEW.usertype IN ('seeker', 'provider') 
       AND OLD.usertype != NEW.usertype THEN
        -- Don't update upgraded_at for lateral moves, but preserve original type
        IF NEW.original_signup_type IS NULL THEN
            NEW.original_signup_type = OLD.usertype;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Install the upgrade tracking trigger
DROP TRIGGER IF EXISTS trigger_track_user_upgrade ON users;
CREATE TRIGGER trigger_track_user_upgrade
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION track_user_upgrade();

RAISE NOTICE '✅ Upgrade tracking system installed';

-- ===============================
-- STEP 7: Create analytics view for monitoring
-- ===============================

-- View for user type analytics and upgrade patterns
CREATE OR REPLACE VIEW user_type_analytics AS
SELECT 
    usertype as current_user_type,
    original_signup_type,
    COUNT(*) as user_count,
    COUNT(upgraded_at) as upgraded_count,
    CASE 
        WHEN COUNT(upgraded_at) > 0 THEN
            AVG(EXTRACT(EPOCH FROM (upgraded_at - createdat))/3600)
        ELSE NULL 
    END as avg_hours_to_upgrade
FROM users 
WHERE usertype IS NOT NULL
GROUP BY usertype, original_signup_type
ORDER BY user_count DESC;

-- Grant access to analytics view
GRANT SELECT ON user_type_analytics TO authenticated;

RAISE NOTICE '✅ Analytics view created for monitoring';

-- ===============================
-- STEP 8: Final verification (CORRECTED QUERIES)
-- ===============================

DO $$
DECLARE
    final_user_count INTEGER;
    constraint_exists BOOLEAN;
    upgrade_function_exists BOOLEAN;
    analytics_view_exists BOOLEAN;
    new_constraint_check TEXT;
BEGIN
    -- Verify user count unchanged
    SELECT COUNT(*) INTO final_user_count FROM users;
    
    -- Check new constraint exists (CORRECTED - no table_name in check_constraints)
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = 'check_user_type'
        AND tc.table_name = 'users'
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'CHECK'
    ) INTO constraint_exists;
    
    -- Get constraint definition
    SELECT cc.check_clause INTO new_constraint_check
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.constraint_name = 'check_user_type'
    AND tc.table_name = 'users'
    AND tc.table_schema = 'public';
    
    -- Check function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'track_user_upgrade'
        AND routine_schema = 'public'
    ) INTO upgrade_function_exists;
    
    -- Check view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'user_type_analytics'
        AND table_schema = 'public'
    ) INTO analytics_view_exists;
    
    -- Final validation
    IF final_user_count != 6 THEN
        RAISE EXCEPTION 'Data integrity violated: Expected 6 users, found %', final_user_count;
    END IF;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'Migration failed: check_user_type constraint not created';
    END IF;
    
    IF new_constraint_check IS NULL OR new_constraint_check NOT ILIKE '%quick_access%' THEN
        RAISE EXCEPTION 'Migration failed: new constraint does not include quick_access. Found: %', COALESCE(new_constraint_check, 'NULL');
    END IF;
    
    IF NOT upgrade_function_exists THEN
        RAISE EXCEPTION 'Migration failed: track_user_upgrade function not created';
    END IF;
    
    IF NOT analytics_view_exists THEN
        RAISE EXCEPTION 'Migration failed: user_type_analytics view not created';
    END IF;
    
    -- Success message
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '📊 All production data preserved (6 users intact)';
    RAISE NOTICE '✅ quick_access userType is now available';
    RAISE NOTICE '🔧 Upgrade tracking system active';
    RAISE NOTICE '📈 Analytics monitoring enabled';
    RAISE NOTICE '🔒 Zero data loss - all integrity checks passed';
    RAISE NOTICE '';
    RAISE NOTICE 'New constraint definition: %', new_constraint_check;
END $$;

-- Show final production data state
SELECT 
    usertype as "Current User Type",
    original_signup_type as "Original Type", 
    COUNT(*) as "Count"
FROM users 
WHERE usertype IS NOT NULL
GROUP BY usertype, original_signup_type 
ORDER BY COUNT(*) DESC;

COMMIT;

-- ===============================
-- VERIFICATION COMMANDS (run after migration succeeds)
-- ===============================

-- 1. Test that quick_access is now allowed:
-- INSERT INTO users (id, name, usertype, createdat, updatedat) 
-- VALUES ((SELECT id FROM auth.users LIMIT 1), 'Test Quick User', 'quick_access', NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET usertype = 'quick_access';

-- 2. View analytics:
-- SELECT * FROM user_type_analytics;

-- 3. Check all constraints on users table:
-- SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
-- FROM information_schema.table_constraints tc
-- LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
-- WHERE tc.table_name = 'users' AND tc.table_schema = 'public'
-- ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Verify production data is intact:
-- SELECT usertype, COUNT(*), MIN(createdat), MAX(createdat) 
-- FROM users GROUP BY usertype;