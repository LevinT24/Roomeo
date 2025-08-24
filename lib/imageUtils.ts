// lib/imageUtils.ts - Image optimization utilities

export interface ImageCompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ImageResizeResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compress an image file while maintaining aspect ratio
 */
export function compressImage(
  file: File, 
  options: ImageCompressOptions = {}
): Promise<ImageResizeResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          const compressedFile = new File([blob], file.name, {
            type: blob.type,
            lastModified: Date.now(),
          });
          
          const originalSize = file.size;
          const compressedSize = compressedFile.size;
          const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
          
          resolve({
            file: compressedFile,
            originalSize,
            compressedSize,
            compressionRatio
          });
        },
        `image/${format}`,
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate multiple sizes of an image for responsive loading
 */
export async function generateResponsiveSizes(
  file: File,
  sizes: number[] = [400, 800, 1200]
): Promise<{ size: number; file: File }[]> {
  const results = await Promise.all(
    sizes.map(async (size) => {
      const compressed = await compressImage(file, {
        maxWidth: size,
        maxHeight: size,
        quality: 0.85
      });
      
      return {
        size,
        file: compressed.file
      };
    })
  );
  
  return results;
}

/**
 * Validate image file type and size
 */
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  } = options;
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Only ${allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} images are allowed`
    };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `Image must be less than ${maxSizeMB}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Create a thumbnail from an image file
 */
export function createThumbnail(file: File, size: number = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      const { width, height } = img;
      const aspectRatio = width / height;
      
      let newWidth = size;
      let newHeight = size;
      
      if (aspectRatio > 1) {
        newHeight = size / aspectRatio;
      } else {
        newWidth = size * aspectRatio;
      }
      
      canvas.width = size;
      canvas.height = size;
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      
      // Center the image
      const x = (size - newWidth) / 2;
      const y = (size - newHeight) / 2;
      
      ctx.drawImage(img, x, y, newWidth, newHeight);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if image dimensions are suitable for room photos
 */
export function validateImageDimensions(file: File): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      
      // Check minimum dimensions
      if (width < 400 || height < 300) {
        resolve({
          valid: false,
          error: 'Image must be at least 400x300 pixels'
        });
        return;
      }
      
      // Check aspect ratio (should be reasonable for room photos)
      const aspectRatio = width / height;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        resolve({
          valid: false,
          error: 'Image aspect ratio should be between 1:2 and 3:1 for best display'
        });
        return;
      }
      
      resolve({ valid: true });
    };
    
    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Could not read image dimensions'
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}