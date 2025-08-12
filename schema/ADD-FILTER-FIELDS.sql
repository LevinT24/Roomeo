-- ===============================
-- Add Filter Fields to Users Table
-- Adds universityAffiliation, professionalStatus, and area fields for filtering
-- ===============================

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS universityAffiliation TEXT,
ADD COLUMN IF NOT EXISTS professionalStatus TEXT CHECK (professionalStatus IN ('student', 'employed', 'unemployed')),
ADD COLUMN IF NOT EXISTS area TEXT;

-- Create indexes for performance on filter fields
CREATE INDEX IF NOT EXISTS idx_users_university_affiliation ON users(universityAffiliation);
CREATE INDEX IF NOT EXISTS idx_users_professional_status ON users(professionalStatus);
CREATE INDEX IF NOT EXISTS idx_users_area ON users(area);
CREATE INDEX IF NOT EXISTS idx_users_age ON users(age);
CREATE INDEX IF NOT EXISTS idx_users_budget ON users(budget);

-- Update column names to be consistent (lowercase)
-- Note: The existing schema might have camelCase columns, ensure consistency
DO $$ 
BEGIN
    -- Fix column name inconsistencies if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profilePicture') THEN
        ALTER TABLE users RENAME COLUMN "profilePicture" TO profilepicture;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        ALTER TABLE users RENAME COLUMN "createdAt" TO createdat;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
        ALTER TABLE users RENAME COLUMN "updatedAt" TO updatedat;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isVerified') THEN
        ALTER TABLE users RENAME COLUMN "isVerified" TO isverified;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'userType') THEN
        ALTER TABLE users RENAME COLUMN "userType" TO usertype;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if columns don't exist or are already lowercase
    NULL;
END $$;

-- Verify the new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('universityaffiliation', 'professionalstatus', 'area')
ORDER BY column_name;