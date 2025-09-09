-- ==========================================
-- FIX STORAGE RLS POLICIES FOR SETTLEMENT PROOF UPLOADS
-- ==========================================
-- This script adds the necessary Row Level Security policies 
-- to allow authenticated users to upload settlement proof images
-- to the room-photos bucket

-- 1. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload settlement proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view settlement proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view room photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload room photos" ON storage.objects;

-- 2. Allow authenticated users to upload settlement proof images
CREATE POLICY "Allow authenticated users to upload settlement proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'room-photos' 
  AND (storage.foldername(name))[1] = 'settlement_proofs'
);

-- 3. Allow authenticated users to view settlement proof images
CREATE POLICY "Allow authenticated users to view settlement proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'room-photos' 
  AND (storage.foldername(name))[1] = 'settlement_proofs'
);

-- 4. Allow users to view all room photos (general policy)
CREATE POLICY "Allow users to view room photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'room-photos'
);

-- 5. Allow users to upload their own room photos
CREATE POLICY "Allow users to upload room photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'room-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Display current policies for verification
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;