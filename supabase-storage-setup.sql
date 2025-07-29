-- Supabase Storage Setup for Image Uploads
-- Run this in your Supabase SQL Editor

-- 1. Create the avatars bucket (if it doesn't exist)
-- Note: You can also create this through the Supabase Dashboard > Storage

-- 2. Set up storage policies for the avatars bucket

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

-- Allow public access to view avatars
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Optional: Create a function to get user avatar URL
CREATE OR REPLACE FUNCTION get_user_avatar_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  avatar_url TEXT;
BEGIN
  -- Try to get the avatar URL from storage
  SELECT storage.get_public_url('avatars', user_id::text || '.jpg') INTO avatar_url;
  
  -- If no URL found, return a default
  IF avatar_url IS NULL THEN
    RETURN '/default-avatar.png';
  END IF;
  
  RETURN avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- 5. Create a trigger to automatically update user profile when avatar is uploaded
CREATE OR REPLACE FUNCTION handle_avatar_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's profile picture URL in the users table
  UPDATE users 
  SET profilePicture = storage.get_public_url('avatars', NEW.name),
      updatedAt = NOW()
  WHERE id = NEW.name::UUID;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER avatar_upload_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'avatars')
  EXECUTE FUNCTION handle_avatar_upload();

-- 6. Test the setup
-- You can test the policies by running:
-- SELECT * FROM storage.objects WHERE bucket_id = 'avatars'; 