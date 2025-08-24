"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadRoomPhotos } from '@/services/roomPhotos';
import { RoomPhoto, ROOM_PHOTO_LIMITS } from '@/types/roomPhotos';

interface RoomPhotoUploadProps {
  onPhotosUploaded?: (photos: RoomPhoto[]) => void;
  maxPhotos?: number;
  existingPhotos?: RoomPhoto[];
  disabled?: boolean;
}

interface FileWithPreview {
  file: File;
  preview: string;
  caption: string;
  id: string;
}

export default function RoomPhotoUpload({ 
  onPhotosUploaded,
  maxPhotos = ROOM_PHOTO_LIMITS.MAX_PHOTOS_PER_USER,
  existingPhotos = [],
  disabled = false
}: RoomPhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate remaining photo slots
  const remainingSlots = maxPhotos - existingPhotos.length;

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ROOM_PHOTO_LIMITS.ALLOWED_TYPES.includes(file.type as any)) {
      return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
    }
    
    if (file.size > ROOM_PHOTO_LIMITS.MAX_FILE_SIZE) {
      return { valid: false, error: 'Image must be less than 5MB' };
    }
    
    return { valid: true };
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    if (disabled) return;
    
    setError('');
    const fileArray = Array.from(files);
    
    // Check if adding these files would exceed limits
    if (selectedFiles.length + fileArray.length > remainingSlots) {
      setError(`Cannot add ${fileArray.length} photos. You can only add ${remainingSlots} more photos.`);
      return;
    }
    
    const newFiles: FileWithPreview[] = [];
    
    for (const file of fileArray) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`);
        return;
      }
      
      // Create preview
      const preview = URL.createObjectURL(file);
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      newFiles.push({
        file,
        preview,
        caption: '',
        id
      });
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Set first photo as primary if it's the only one and no existing photos have primary
    if (selectedFiles.length === 0 && existingPhotos.length === 0) {
      setPrimaryPhotoIndex(0);
    }
  }, [selectedFiles, remainingSlots, existingPhotos.length, disabled]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect, disabled]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file
  const removeFile = (id: string) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      // Clean up object URL
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
    
    // Adjust primary photo index if needed
    const removedIndex = selectedFiles.findIndex(f => f.id === id);
    if (removedIndex === primaryPhotoIndex && selectedFiles.length > 1) {
      setPrimaryPhotoIndex(0);
    } else if (removedIndex < primaryPhotoIndex) {
      setPrimaryPhotoIndex(prev => Math.max(0, prev - 1));
    }
  };

  // Update caption
  const updateCaption = (id: string, caption: string) => {
    setSelectedFiles(prev => 
      prev.map(f => f.id === id ? { ...f, caption } : f)
    );
  };

  // Handle upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one photo to upload');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    try {
      const files = selectedFiles.map(f => f.file);
      const captions = selectedFiles.map(f => f.caption || undefined);
      
      const result = await uploadRoomPhotos(files, captions, primaryPhotoIndex);
      
      if (result.success && result.photos) {
        // Clean up object URLs
        selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setSelectedFiles([]);
        setPrimaryPhotoIndex(0);
        
        // Notify parent component
        onPhotosUploaded?.(result.photos);
      } else {
        setError(result.message || 'Failed to upload photos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  // Clear all files
  const clearAllFiles = () => {
    selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    setPrimaryPhotoIndex(0);
    setError('');
  };

  // Clean up object URLs on unmount
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragOver
            ? 'border-[#44C76F] bg-[#44C76F]/10'
            : disabled 
            ? 'border-gray-300 bg-gray-50'
            : 'border-[#004D40] hover:border-[#44C76F] hover:bg-[#44C76F]/5'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ROOM_PHOTO_LIMITS.ALLOWED_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          id="room-photos-input"
          disabled={disabled}
        />
        
        <div className="space-y-4">
          <div className={`text-6xl ${disabled ? 'text-gray-300' : 'text-[#004D40]'}`}>
            📸
          </div>
          
          <div>
            <h3 className={`text-lg font-black mb-2 ${disabled ? 'text-gray-400' : 'text-[#004D40]'}`}>
              Upload Room Photos
            </h3>
            <p className={`text-sm font-bold mb-4 ${disabled ? 'text-gray-400' : 'text-[#004D40]'}`}>
              Show off your space! Drag and drop photos here or click to browse.
            </p>
          </div>
          
          <div className={`text-xs font-bold space-y-1 ${disabled ? 'text-gray-400' : 'text-[#004D40]'}`}>
            <p>JPG, PNG, WEBP • Max 5MB each • Up to {maxPhotos} photos</p>
            <p>Remaining slots: <span className="text-[#44C76F]">{remainingSlots}</span></p>
          </div>
          
          {!disabled && (
            <label
              htmlFor="room-photos-input"
              className="inline-block bg-[#44C76F] text-[#004D40] font-black px-6 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all cursor-pointer"
            >
              CHOOSE PHOTOS
            </label>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-4 border-red-500 bg-red-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-black">⚠️</span>
            <span className="font-black text-red-700">UPLOAD ERROR</span>
          </div>
          <p className="text-red-700 font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#004D40]">
              Selected Photos ({selectedFiles.length})
            </h3>
            <Button
              onClick={clearAllFiles}
              variant="outline"
              size="sm"
              className="font-bold"
              disabled={isUploading}
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedFiles.map((fileWithPreview, index) => (
              <div
                key={fileWithPreview.id}
                className={`border-4 rounded-lg overflow-hidden ${
                  index === primaryPhotoIndex
                    ? 'border-[#44C76F] shadow-[4px_4px_0px_0px_#44C76F]'
                    : 'border-[#004D40] shadow-[2px_2px_0px_0px_#004D40]'
                }`}
              >
                <div className="relative">
                  <img
                    src={fileWithPreview.preview}
                    alt={`Selected ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                  
                  {/* Primary Badge */}
                  {index === primaryPhotoIndex && (
                    <div className="absolute top-2 left-2 bg-[#44C76F] text-[#004D40] px-2 py-1 rounded font-black text-xs">
                      PRIMARY
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(fileWithPreview.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors"
                    disabled={isUploading}
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-4 bg-[#F2F5F1] space-y-3">
                  {/* Caption Input */}
                  <Input
                    placeholder="Add a caption (optional)"
                    value={fileWithPreview.caption}
                    onChange={(e) => updateCaption(fileWithPreview.id, e.target.value)}
                    className="w-full border-2 border-[#004D40] font-bold"
                    disabled={isUploading}
                  />
                  
                  {/* Set Primary Button */}
                  {index !== primaryPhotoIndex && (
                    <button
                      onClick={() => setPrimaryPhotoIndex(index)}
                      className="w-full text-sm font-bold text-[#004D40] hover:text-[#44C76F] transition-colors"
                      disabled={isUploading}
                    >
                      Set as Primary Photo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Upload Button */}
          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="flex-1 bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
            >
              {isUploading ? 'UPLOADING...' : `UPLOAD ${selectedFiles.length} PHOTO${selectedFiles.length === 1 ? '' : 'S'}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}