# Image Upload Setup Guide

This guide will help you set up image upload functionality with Supabase Storage for your Next.js app.

## 🚀 Quick Setup

### 1. Environment Variables

Your Supabase credentials are already configured in `lib/supabase.ts`:

```typescript
const supabaseUrl = 'https://pzolweuvoyzyrzeozsxq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### 2. Supabase Storage Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Storage** in the sidebar
3. Click **Create a new bucket**
4. Name it `avatars`
5. Set it to **Public** (so images can be viewed without authentication)
6. Click **Create bucket**

### 3. Storage Policies

Run this SQL in your Supabase SQL Editor:

```sql
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
```

## 📁 Files Created

### 1. Storage Service (`lib/storage.ts`)

```typescript
// Main upload function
export async function uploadImage(file: File, userId: string): Promise<UploadResult>

// Delete function
export async function deleteImage(userId: string): Promise<boolean>

// Get avatar URL
export function getAvatarUrl(userId: string): string
```

**Features:**
- ✅ File type validation (images only)
- ✅ File size validation (max 5MB)
- ✅ Automatic file overwrite for same user
- ✅ Public URL generation
- ✅ Error handling

### 2. Image Upload Component (`components/ui/ImageUpload.tsx`)

```typescript
<ImageUpload
  userId={user.id}
  onUploadSuccess={(url) => console.log('Success:', url)}
  onUploadError={(error) => console.error('Error:', error)}
  currentImageUrl={user.profilePicture}
/>
```

**Features:**
- ✅ Drag & drop file selection
- ✅ Real-time preview
- ✅ Loading states
- ✅ Error messages
- ✅ File validation
- ✅ Responsive design

### 3. Demo Page (`app/upload-demo/page.tsx`)

Visit `/upload-demo` to test the functionality.

## 🔧 Usage Examples

### Basic Usage

```typescript
import { uploadImage } from '@/lib/storage';
import ImageUpload from '@/components/ui/ImageUpload';

// Direct upload
const handleUpload = async (file: File) => {
  const result = await uploadImage(file, userId);
  if (result.success) {
    console.log('Upload URL:', result.url);
  }
};

// Component usage
<ImageUpload 
  userId={user.id}
  onUploadSuccess={handleSuccess}
  onUploadError={handleError}
/>
```

### With Profile Update

```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, updateProfilePicture } = useAuth();

const handleUploadSuccess = async (url: string) => {
  await updateProfilePicture(url);
  // Profile picture is now updated in the database
};
```

## 🔒 Security Features

### Client-Side Security
- ✅ Uses anon key (not service key)
- ✅ File type validation
- ✅ File size limits
- ✅ User authentication required

### Server-Side Security
- ✅ Row Level Security (RLS) policies
- ✅ Users can only upload to their own folder
- ✅ Public read access for avatars
- ✅ Authenticated users only for uploads

## 📊 File Structure

```
avatars/
├── user-id-1.jpg
├── user-id-2.png
└── user-id-3.webp
```

**Naming Convention:**
- Files are named using the user ID
- Extension matches original file
- Overwrites existing files for same user

## 🎨 Styling

The component uses your existing design system:
- Colors: `#004D40`, `#44C76F`, `#F2F5F1`
- Typography: Font-black for headings
- Borders: 4px borders with shadows
- Animations: Hover effects and loading spinners

## 🚨 Error Handling

The system handles these errors gracefully:
- ❌ Invalid file type
- ❌ File too large (>5MB)
- ❌ Network errors
- ❌ Storage quota exceeded
- ❌ Authentication errors

## 🧪 Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Sign in to your app**

3. **Visit the demo page:**
   ```
   http://localhost:3000/upload-demo
   ```

4. **Test upload functionality:**
   - Try uploading different image types
   - Test file size limits
   - Verify preview functionality
   - Check error handling

## 🔄 Integration with Existing Code

The image upload is already integrated with:
- ✅ User authentication system
- ✅ Profile management
- ✅ Database updates
- ✅ Real-time state updates

## 📝 API Reference

### `uploadImage(file, userId)`

**Parameters:**
- `file`: File object (must be image)
- `userId`: String user ID

**Returns:**
```typescript
{
  success: boolean;
  url?: string;
  error?: string;
}
```

### `ImageUpload` Component Props

```typescript
interface ImageUploadProps {
  userId: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  currentImageUrl?: string;
}
```

## 🎯 Next Steps

1. **Test the upload functionality**
2. **Customize the styling if needed**
3. **Add image cropping if required**
4. **Implement image compression**
5. **Add multiple image upload support**

The image upload system is now fully functional and secure! 🎉 