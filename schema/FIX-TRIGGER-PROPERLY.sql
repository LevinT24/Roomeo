-- Fix the trigger function to work with both updated_at and updatedat columns
-- This way it won't break other tables

-- Drop only the users trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_users_updatedat ON users;

-- Update the existing function to handle both column names
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to update updated_at first (for other tables)
    IF TG_TABLE_NAME = 'users' THEN
        -- For users table, use updatedat (lowercase)
        NEW.updatedat = NOW();
    ELSE
        -- For other tables, use updated_at (snake_case)
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table using the updated function
CREATE TRIGGER update_users_updatedat BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();