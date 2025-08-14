/**
 * ChatMedia Service - Handle image uploads and media management for chat
 */

import { supabase } from '@/lib/supabase'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  success: boolean
  publicUrl?: string
  thumbnailUrl?: string
  fileName?: string
  error?: string
}

/**
 * Upload image to Supabase Storage for chat
 */
export async function uploadChatImage(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'Image must be smaller than 5MB' }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    // Create a progress tracking wrapper if callback provided
    let uploadFile = file
    if (onProgress) {
      // Note: Supabase doesn't directly support upload progress callbacks
      // This is a placeholder for potential future implementation
      onProgress({ loaded: 0, total: file.size, percentage: 0 })
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, uploadFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    if (!publicUrlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' }
    }

    // Complete progress if callback provided
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 })
    }

    // Generate thumbnail if needed (optional feature)
    let thumbnailUrl: string | undefined
    try {
      thumbnailUrl = await generateThumbnail(publicUrlData.publicUrl, file)
    } catch (thumbnailError) {
      console.warn('Thumbnail generation failed:', thumbnailError)
      // Continue without thumbnail
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      thumbnailUrl,
      fileName: data.path
    }

  } catch (error) {
    console.error('Image upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Generate thumbnail for image (client-side resizing)
 */
export async function generateThumbnail(
  imageUrl: string,
  originalFile: File,
  maxWidth: number = 300,
  maxHeight: number = 300,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        canvas.width = width
        canvas.height = height

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob)
              resolve(thumbnailUrl)
            } else {
              reject(new Error('Failed to create thumbnail blob'))
            }
          },
          originalFile.type,
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'))
    }

    img.src = imageUrl
  })
}

/**
 * Delete image from storage
 */
export async function deleteChatImage(fileName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from('chat-images')
      .remove([fileName])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Get optimized image URL with transformations (if supported)
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  } = {}
): string {
  // For now, return original URL
  // In the future, this could be enhanced with image CDN transformations
  return originalUrl
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF.' }
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 5MB' }
  }

  // Check minimum dimensions (optional)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (img.width < 10 || img.height < 10) {
        resolve({ valid: false, error: 'Image dimensions too small' })
      } else {
        resolve({ valid: true })
      }
    }
    img.onerror = () => {
      resolve({ valid: false, error: 'Invalid image file' })
    }
    img.src = URL.createObjectURL(file)
  }) as any // Type assertion for synchronous return in most cases
}

/**
 * Compress image before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        let { width, height } = img

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height
          
          if (width > height) {
            width = Math.min(width, maxWidth)
            height = width / aspectRatio
          } else {
            height = Math.min(height, maxHeight)
            width = height * aspectRatio
          }
        }

        // Create canvas
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        canvas.width = width
        canvas.height = height

        // Draw compressed image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Batch upload multiple images
 */
export async function uploadMultipleChatImages(
  files: File[],
  userId: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    try {
      const result = await uploadChatImage(
        file,
        userId,
        onProgress ? (progress) => onProgress(i, progress) : undefined
      )
      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  return results
}

/**
 * Get image metadata
 */
export async function getImageMetadata(file: File): Promise<{
  width: number
  height: number
  size: number
  type: string
  aspectRatio: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type,
        aspectRatio: img.width / img.height
      })
    }
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}