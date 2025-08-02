// lib/storage.ts - Supabase Storage utilities with enhanced error handling
import { supabase } from './supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Get Supabase URL for manual URL generation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzolweuvoyzyrzeozsxq.supabase.co';

/**
 * Check if a bucket exists in Supabase Storage
 */
export async function checkBucketExists(bucketName: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking if bucket '${bucketName}' exists...`);
    
    const { data, error } = await supabase.storage.getBucket(bucketName);
    
    if (error) {
      console.warn(`⚠️ Bucket '${bucketName}' check failed:`, error.message);
      return false;
    }
    
    console.log(`✅ Bucket '${bucketName}' exists`);
    return true;
  } catch (error) {
    console.error(`❌ Error checking bucket '${bucketName}':`, error);
    return false;
  }
}

/**
 * Generate public URL manually as fallback
 */
function generatePublicUrl(fileName: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
}

/**
 * Enhanced image upload with comprehensive error handling
 */
export async function uploadImage(file: File, userId: string): Promise<UploadResult> {
  try {
    console.log('🔄 Starting image upload for user:', userId);
    
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }
    
    // Check if avatars bucket exists
    const bucketExists = await checkBucketExists('avatars');
    if (!bucketExists) {
      console.warn('⚠️ Avatars bucket does not exist. Upload may fail.');
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    
    console.log('📁 Uploading file:', fileName);
    
    // Upload to Supabase Storage with enhanced error handling
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      
      // Handle specific error types
      if (uploadError.message?.includes('bucket')) {
        throw new Error('Storage bucket not found. Please check your Supabase configuration.');
      } else if (uploadError.message?.includes('permission')) {
        throw new Error('Permission denied. Please check your storage policies.');
      } else if (uploadError.message?.includes('413')) {
        throw new Error('File too large. Please choose a smaller image.');
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
    }
    
    if (!data?.path) {
      throw new Error('Upload succeeded but no file path returned');
    }
    
    console.log('✅ File uploaded successfully:', data.path);
    
    // Try to get public URL with fallback
    let publicUrl: string;
    
    try {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      if (urlData?.publicUrl) {
        publicUrl = urlData.publicUrl;
        console.log('✅ Public URL generated via Supabase:', publicUrl);
      } else {
        throw new Error('Supabase getPublicUrl returned no URL');
      }
    } catch (urlError) {
      console.warn('⚠️ Supabase getPublicUrl failed, using manual URL generation:', urlError);
      
      // Fallback: Generate URL manually
      publicUrl = generatePublicUrl(fileName);
      console.log('✅ Using manual URL generation:', publicUrl);
    }
    
    return {
      success: true,
      url: publicUrl
    };
    
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    
    // Return detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Enhanced image deletion with better error handling
 */
export async function deleteImage(fileName: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting image:', fileName);
    
    if (!fileName) {
      console.warn('⚠️ No filename provided for deletion');
      return false;
    }
    
    const { error } = await supabase.storage
      .from('avatars')
      .remove([fileName]);
    
    if (error) {
      console.error('❌ Delete error:', error);
      
      // Handle specific error types
      if (error.message?.includes('not found')) {
        console.warn('⚠️ File not found for deletion (may have been already deleted)');
        return true; // Consider this a success since the goal is achieved
      } else if (error.message?.includes('permission')) {
        console.error('❌ Permission denied for file deletion');
        return false;
      } else {
        console.error('❌ Unknown deletion error:', error.message);
        return false;
      }
    }
    
    console.log('✅ Image deleted successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Image deletion failed:', error);
    return false;
  }
}

/**
 * Enhanced image URL retrieval with fallback
 */
export async function getImageUrl(fileName: string): Promise<string | null> {
  try {
    if (!fileName) {
      console.warn('⚠️ No filename provided for URL retrieval');
      return null;
    }
    
    // Try Supabase getPublicUrl first
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    if (data?.publicUrl) {
      console.log('✅ Image URL retrieved via Supabase:', data.publicUrl);
      return data.publicUrl;
    }
    
    // Fallback: Generate URL manually
    console.warn('⚠️ Supabase getPublicUrl failed, using manual URL generation');
    const manualUrl = generatePublicUrl(fileName);
    console.log('✅ Using manual URL generation:', manualUrl);
    return manualUrl;
    
  } catch (error) {
    console.error('❌ Error getting image URL:', error);
    
    // Final fallback: manual URL generation
    try {
      const manualUrl = generatePublicUrl(fileName);
      console.log('✅ Using manual URL generation as fallback:', manualUrl);
      return manualUrl;
    } catch (fallbackError) {
      console.error('❌ Manual URL generation also failed:', fallbackError);
      return null;
    }
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large. Maximum size is 5MB.' };
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }
  
  return { valid: true };
}

/**
 * Test storage functionality
 */
export async function testStorageConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🧪 Testing Supabase Storage connection...');
    
    // Check if avatars bucket exists
    const bucketExists = await checkBucketExists('avatars');
    
    if (!bucketExists) {
      return {
        success: false,
        error: 'Avatars bucket does not exist. Please check your Supabase storage setup.'
      };
    }
    
    console.log('✅ Storage connection test passed');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Storage connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Storage test failed'
    };
  }
} 