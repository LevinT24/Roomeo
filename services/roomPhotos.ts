// services/roomPhotos.ts - Room photo management services
import { supabase } from "@/lib/supabase";

export interface RoomPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  caption?: string;
  is_primary: boolean;
  display_order: number;
  uploaded_at: string;
}

export interface UploadRoomPhotoRequest {
  file: File;
  caption?: string;
  is_primary?: boolean;
}

export interface UploadRoomPhotosResponse {
  success: boolean;
  photos?: RoomPhoto[];
  message?: string;
}

// Helper function to ensure user is authenticated
async function ensureAuthenticated() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required');
  }
  return user;
}

// Compress and validate image file
function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file); // Fallback to original if compression fails
        }
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Validate image file
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 5MB' };
  }
  
  return { valid: true };
}

// Upload multiple room photos
export async function uploadRoomPhotos(
  files: File[],
  captions: (string | undefined)[] = [],
  primaryPhotoIndex: number = 0
): Promise<UploadRoomPhotosResponse> {
  try {
    console.log('🔄 Uploading room photos:', files.length);
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    // Validate file count (max 15 photos per user)
    const existingPhotos = await getRoomPhotos(user.id);
    if (existingPhotos.length + files.length > 15) {
      return {
        success: false,
        message: `Cannot upload ${files.length} photos. Maximum 15 photos per user (you have ${existingPhotos.length} existing).`
      };
    }
    
    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const validation = validateImageFile(files[i]);
      if (!validation.valid) {
        return {
          success: false,
          message: `File ${files[i].name}: ${validation.error}`
        };
      }
    }
    
    const uploadedPhotos: RoomPhoto[] = [];
    
    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const caption = captions[i];
      const isPrimary = i === primaryPhotoIndex && existingPhotos.length === 0; // Only set primary if no existing photos
      
      try {
        // Compress image
        const compressedFile = await compressImage(file);
        
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('room-photos')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('room-photos')
          .getPublicUrl(filePath);
          
        if (!publicUrlData.publicUrl) {
          throw new Error(`Failed to get public URL for ${file.name}`);
        }
        
        // Save metadata to database
        const { data: photoData, error: dbError } = await supabase
          .from('room_photos')
          .insert({
            user_id: user.id,
            photo_url: publicUrlData.publicUrl,
            caption: caption || null,
            is_primary: isPrimary
          })
          .select()
          .single();
          
        if (dbError) {
          console.error('Database error:', dbError);
          // Clean up uploaded file if database insert fails
          await supabase.storage
            .from('room-photos')
            .remove([filePath]);
          throw new Error(`Failed to save ${file.name} metadata: ${dbError.message}`);
        }
        
        uploadedPhotos.push(photoData);
        console.log(`✅ Uploaded ${file.name}`);
        
      } catch (fileError) {
        console.error(`Error uploading ${file.name}:`, fileError);
        // Clean up any partial uploads
        for (const uploaded of uploadedPhotos) {
          await deleteRoomPhoto(uploaded.id);
        }
        return {
          success: false,
          message: fileError instanceof Error ? fileError.message : `Failed to upload ${file.name}`
        };
      }
    }
    
    console.log('✅ All photos uploaded successfully');
    return {
      success: true,
      photos: uploadedPhotos
    };
    
  } catch (error) {
    console.error('❌ Exception uploading room photos:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload room photos'
    };
  }
}

// Get all room photos for a user
export async function getRoomPhotos(userId?: string): Promise<RoomPhoto[]> {
  try {
    console.log('🔄 Fetching room photos for user:', userId || 'current user');
    
    let targetUserId = userId;
    
    // If no userId provided, get current user
    if (!targetUserId) {
      const user = await ensureAuthenticated();
      targetUserId = user.id;
    }
    
    // Use the database function for better performance
    const { data, error } = await supabase.rpc('get_user_room_photos', {
      target_user_id: targetUserId
    });
    
    if (error) {
      console.error('Error fetching room photos:', error);
      // Fallback to direct query if function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('room_photos')
        .select('*')
        .eq('user_id', targetUserId)
        .order('display_order', { ascending: true });
        
      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
      
      return fallbackData || [];
    }
    
    console.log('✅ Room photos retrieved:', data?.length || 0);
    return data || [];
    
  } catch (error) {
    console.error('❌ Exception fetching room photos:', error);
    return [];
  }
}

// Get primary room photo for a user
export async function getPrimaryRoomPhoto(userId: string): Promise<RoomPhoto | null> {
  try {
    console.log('🔄 Fetching primary room photo for user:', userId);
    
    // Use the database function
    const { data, error } = await supabase.rpc('get_primary_room_photo', {
      target_user_id: userId
    });
    
    if (error) {
      console.error('Error fetching primary room photo:', error);
      // Fallback to direct query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('room_photos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();
        
      if (fallbackError) {
        // Not an error if no primary photo exists
        return null;
      }
      
      return fallbackData;
    }
    
    console.log('✅ Primary room photo retrieved');
    return data && data.length > 0 ? data[0] : null;
    
  } catch (error) {
    console.error('❌ Exception fetching primary room photo:', error);
    return null;
  }
}

// Set a photo as primary
export async function setPrimaryPhoto(photoId: string): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('🔄 Setting primary photo:', photoId);
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    // Update the photo to be primary (trigger will handle unsetting others)
    const { error } = await supabase
      .from('room_photos')
      .update({ is_primary: true })
      .eq('id', photoId)
      .eq('user_id', user.id); // Ensure user can only update their own photos
      
    if (error) {
      console.error('Error setting primary photo:', error);
      throw new Error(error.message);
    }
    
    console.log('✅ Primary photo set successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Exception setting primary photo:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to set primary photo'
    };
  }
}

// Delete a room photo
export async function deleteRoomPhoto(photoId: string): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('🔄 Deleting room photo:', photoId);
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    // Get photo details first to delete from storage
    const { data: photo, error: getError } = await supabase
      .from('room_photos')
      .select('photo_url, user_id')
      .eq('id', photoId)
      .eq('user_id', user.id) // Ensure user can only delete their own photos
      .single();
      
    if (getError || !photo) {
      throw new Error('Photo not found or you do not have permission to delete it');
    }
    
    // Extract file path from URL
    const url = photo.photo_url;
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'room-photos');
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    
    // Delete from database first
    const { error: dbError } = await supabase
      .from('room_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id);
      
    if (dbError) {
      console.error('Error deleting photo from database:', dbError);
      throw new Error(dbError.message);
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('room-photos')
      .remove([filePath]);
      
    if (storageError) {
      console.warn('Warning: Failed to delete file from storage:', storageError);
      // Don't fail the operation if storage deletion fails
    }
    
    console.log('✅ Room photo deleted successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Exception deleting room photo:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete room photo'
    };
  }
}

// Update photo caption
export async function updatePhotoCaption(
  photoId: string, 
  caption: string
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('🔄 Updating photo caption:', photoId);
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    const { error } = await supabase
      .from('room_photos')
      .update({ caption })
      .eq('id', photoId)
      .eq('user_id', user.id); // Ensure user can only update their own photos
      
    if (error) {
      console.error('Error updating photo caption:', error);
      throw new Error(error.message);
    }
    
    console.log('✅ Photo caption updated successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Exception updating photo caption:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update photo caption'
    };
  }
}

// Reorder photos
export async function reorderPhotos(photoIds: string[]): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('🔄 Reordering photos:', photoIds);
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    // Update display order for each photo
    const updates = photoIds.map((photoId, index) => 
      supabase
        .from('room_photos')
        .update({ display_order: index + 1 })
        .eq('id', photoId)
        .eq('user_id', user.id)
    );
    
    await Promise.all(updates);
    
    console.log('✅ Photos reordered successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Exception reordering photos:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reorder photos'
    };
  }
}

// Get room photo count for a user
export async function getRoomPhotoCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('room_photos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error getting photo count:', error);
      return 0;
    }
    
    return count || 0;
    
  } catch (error) {
    console.error('❌ Exception getting photo count:', error);
    return 0;
  }
}