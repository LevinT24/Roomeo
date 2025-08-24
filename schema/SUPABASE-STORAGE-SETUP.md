# Supabase Storage Setup for Room Photos

## Storage Bucket Configuration

### 1. Create Storage Bucket

In your Supabase dashboard, go to Storage and create a new bucket:

```sql
-- Run this in the SQL Editor or create via dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'room-photos', 
  'room-photos', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

Or create via the dashboard:
- **Bucket Name**: `room-photos`
- **Public**: `Yes`
- **File Size Limit**: `5MB`
- **Allowed MIME Types**: `image/jpeg, image/png, image/webp`

### 2. Storage Policies

Create these RLS policies for the storage bucket:

```sql
-- Policy to allow anyone to view room photos
CREATE POLICY "Anyone can view room photos" ON storage.objects
FOR SELECT USING (bucket_id = 'room-photos');

-- Policy to allow authenticated users to upload room photos
CREATE POLICY "Authenticated users can upload room photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'room-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own room photos
CREATE POLICY "Users can update own room photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'room-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'room-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own room photos
CREATE POLICY "Users can delete own room photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'room-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. File Path Structure

Photos will be stored using this path structure:
```
room-photos/
├── {user_id}/
│   ├── photo1.jpg
│   ├── photo2.png
│   └── photo3.webp
```

Example:
- `room-photos/123e4567-e89b-12d3-a456-426614174000/room1.jpg`

### 4. Verification

After setup, verify the bucket is working:

1. Go to Storage > room-photos in your Supabase dashboard
2. Try uploading a test image
3. Check that the public URL works
4. Verify RLS policies are active

### 5. Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Usage in Code

The bucket will be accessed via the Supabase client like this:

```typescript
import { supabase } from '@/lib/supabase'

// Upload a file
const { data, error } = await supabase.storage
  .from('room-photos')
  .upload(`${userId}/photo.jpg`, file)

// Get public URL
const { data: publicUrl } = supabase.storage
  .from('room-photos')
  .getPublicUrl(`${userId}/photo.jpg`)
```

## Next Steps

1. Run the `ROOM-PHOTOS-SCHEMA.sql` in your Supabase SQL Editor
2. Create the storage bucket using the dashboard or SQL above
3. Verify the setup is working correctly
4. Proceed to implement the room photo services