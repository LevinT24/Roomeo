-- Add hide_profile column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hide_profile BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.users.hide_profile IS 'When true, user profile is hidden from discovery/swipe page but they can still view others';

-- Create index for better performance when filtering hidden profiles
CREATE INDEX IF NOT EXISTS idx_users_hide_profile ON public.users(hide_profile) WHERE hide_profile = FALSE;

-- Update RLS policy to ensure users can update their own hide_profile setting
-- First, check if the policy exists and drop it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        DROP POLICY "Users can update their own profile" ON public.users;
    END IF;
END $$;

-- Recreate the policy to include hide_profile
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);