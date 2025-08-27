"use client"

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadImage, UploadResult } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ImageUploadProps {
  userId: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  currentImageUrl?: string;
}

export default function ImageUpload({ 
  userId, 
  onUploadSuccess, 
  onUploadError, 
  className = "",
  currentImageUrl 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous error
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const result: UploadResult = await uploadImage(file, userId);

      if (result.success && result.url) {
        setPreviewUrl(result.url);
        onUploadSuccess?.(result.url);
        console.log('✅ Image uploaded successfully:', result.url);
      } else {
        const errorMessage = result.error || 'Upload failed';
        setError(errorMessage);
        onUploadError?.(errorMessage);
        console.error('❌ Upload failed:', errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
      console.error('❌ Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Button */}
      <div className="flex flex-col items-center space-y-4">
        <Button
          onClick={handleClick}
          disabled={isUploading}
          className="bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black text-lg py-4 px-6 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all disabled:opacity-50"
        >
          {isUploading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-[#F2F5F1] border-t-transparent rounded-full animate-spin"></div>
              <span>UPLOADING...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>UPLOAD PROFILE PICTURE</span>
            </div>
          )}
        </Button>

        {/* File Requirements */}
        <div className="text-sm text-[#004D40] font-bold text-center">
          <p>Supported formats: JPG, PNG, GIF, WebP</p>
          <p>Maximum size: 5MB</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-center rounded">
          {error}
        </div>
      )}

      {/* Image Preview */}
      {previewUrl && (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Image
              src={previewUrl}
              alt="Profile preview"
              className="w-32 h-32 object-cover rounded-full border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40]"
              width={128}
              height={128}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          {/* Success Message */}
          {!isUploading && !error && (
            <div className="p-2 bg-green-100 border-2 border-green-500 text-green-700 font-bold text-center rounded text-sm">
              ✅ Image uploaded successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
} 