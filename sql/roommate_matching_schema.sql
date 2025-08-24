-- Roommate Matching System Database Schema
-- Run this in your Supabase SQL editor

-- Update users table with role and profile completion status
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_role VARCHAR(20) CHECK (user_role IN ('seeker', 'provider'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ethnicity VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS smoking VARCHAR(20) CHECK (smoking IN ('yes', 'no', 'occasionally'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS drinking VARCHAR(20) CHECK (drinking IN ('yes', 'no', 'occasionally'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS pets VARCHAR(20) CHECK (pets IN ('yes', 'no', 'negotiable'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_min INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_max INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Room images table for providers
CREATE TABLE IF NOT EXISTS room_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL DEFAULT 0,
    caption TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT room_images_user_role_check CHECK (
        (SELECT user_role FROM users WHERE id = user_id) = 'provider'
    )
);

-- Room details table for providers
CREATE TABLE IF NOT EXISTS room_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_type VARCHAR(50) NOT NULL, -- 'private', 'shared', 'studio', 'apartment'
    rent_amount INTEGER NOT NULL,
    deposit_amount INTEGER,
    available_from DATE,
    lease_duration VARCHAR(50), -- '6_months', '1_year', 'flexible'
    furnished BOOLEAN DEFAULT FALSE,
    utilities_included BOOLEAN DEFAULT FALSE,
    amenities TEXT[],
    house_rules TEXT[],
    description TEXT,
    address TEXT NOT NULL,
    neighborhood VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT room_details_user_role_check CHECK (
        (SELECT user_role FROM users WHERE id = user_id) = 'provider'
    )
);

-- Roommate preferences for seekers
CREATE TABLE IF NOT EXISTS seeker_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_gender VARCHAR(20),
    age_range_min INTEGER,
    age_range_max INTEGER,
    preferred_location VARCHAR(255),
    max_budget INTEGER,
    preferred_room_type VARCHAR(50),
    lifestyle_preferences JSONB,
    deal_breakers TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT seeker_preferences_user_role_check CHECK (
        (SELECT user_role FROM users WHERE id = user_id) = 'seeker'
    )
);

-- Matches/Likes table
CREATE TABLE IF NOT EXISTS user_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('like', 'pass', 'super_like')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_room_images_user_id ON room_images(user_id);
CREATE INDEX IF NOT EXISTS idx_room_details_user_id ON room_details(user_id);
CREATE INDEX IF NOT EXISTS idx_seeker_preferences_user_id ON seeker_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_user_id ON user_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_target_user_id ON user_matches(target_user_id);

-- Enable Row Level Security
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeker_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_images
CREATE POLICY "Users can view all room images" ON room_images FOR SELECT USING (true);
CREATE POLICY "Users can insert their own room images" ON room_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own room images" ON room_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own room images" ON room_images FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for room_details
CREATE POLICY "Users can view all room details" ON room_details FOR SELECT USING (true);
CREATE POLICY "Users can insert their own room details" ON room_details FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own room details" ON room_details FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own room details" ON room_details FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for seeker_preferences
CREATE POLICY "Users can view their own preferences" ON seeker_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON seeker_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON seeker_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences" ON seeker_preferences FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_matches
CREATE POLICY "Users can view all matches" ON user_matches FOR SELECT USING (true);
CREATE POLICY "Users can insert their own matches" ON user_matches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own matches" ON user_matches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own matches" ON user_matches FOR DELETE USING (auth.uid() = user_id);

-- Function to validate provider has minimum room images
CREATE OR REPLACE FUNCTION validate_provider_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is a provider and marking profile as completed
    IF NEW.user_role = 'provider' AND NEW.profile_completed = TRUE THEN
        -- Check if they have at least 5 room images
        IF (SELECT COUNT(*) FROM room_images WHERE user_id = NEW.id) < 5 THEN
            RAISE EXCEPTION 'Providers must upload at least 5 room images before completing their profile';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile validation
DROP TRIGGER IF EXISTS validate_provider_profile_trigger ON users;
CREATE TRIGGER validate_provider_profile_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_provider_profile();