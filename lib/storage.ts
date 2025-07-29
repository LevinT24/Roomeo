// lib/storage.ts
import { supabase } from './supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image file to Supabase Storage
 * @param file - The file to upload
 * @param userId - The user ID (used as filename)
 * @returns Promise<UploadResult> - Object with success status and URL or error
 */
export async function uploadImage(file: File, userId: string): Promise<UploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image'
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size must be less than 5MB'
      };
    }

    // Create a unique filename for the user
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}.${fileExtension}`;
    const filePath = `${fileName}`;

    console.log('🔄 Uploading image:', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId
    });

    // Upload the file to Supabase Storage (avatars bucket)
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true, // This will overwrite existing files
        cacheControl: '3600',
        contentType: file.type
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Upload successful:', data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('✅ Public URL:', publicUrl);

    return {
      success: true,
      url: publicUrl
    };

  } catch (error) {
    console.error('❌ Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Delete an image from Supabase Storage
 * @param userId - The user ID (used as filename)
 * @returns Promise<boolean> - Success status
 */
export async function deleteImage(userId: string): Promise<boolean> {
  try {
    // Try to delete with different extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    for (const ext of extensions) {
      const fileName = `${userId}.${ext}`;
      
      const { error } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (!error) {
        console.log('✅ Deleted image:', fileName);
        return true;
      }
    }

    console.log('⚠️ No image found to delete for user:', userId);
    return true; // Consider it successful if no file exists

  } catch (error) {
    console.error('❌ Delete error:', error);
    return false;
  }
}

/**
 * Get the public URL of a user's avatar
 * @param userId - The user ID
 * @returns string - The public URL
 */
export function getAvatarUrl(userId: string): string {
  // Try to get URL with different extensions
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  
  for (const ext of extensions) {
    const fileName = `${userId}.${ext}`;
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  }

  // Return a default avatar URL if no image exists
  return '/default-avatar.png';
}