// types/roomPhotos.ts - Room photo type definitions

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

export interface RoomPhotoOperationResponse {
  success: boolean;
  message?: string;
  photo?: RoomPhoto;
}

export interface PhotoGalleryProps {
  photos: RoomPhoto[];
  isOpen: boolean;
  onClose: () => void;
  initialPhotoIndex?: number;
  userName?: string;
  userAge?: number;
  userLocation?: string;
}

export interface RoomPhotoUploadProps {
  onPhotosUploaded?: (photos: RoomPhoto[]) => void;
  maxPhotos?: number;
  existingPhotos?: RoomPhoto[];
}

export interface PhotoManagementProps {
  userId: string;
  photos: RoomPhoto[];
  onPhotosUpdated: (photos: RoomPhoto[]) => void;
}

export interface PhotoCardProps {
  photo: RoomPhoto;
  onEdit?: (photo: RoomPhoto) => void;
  onDelete?: (photoId: string) => void;
  onSetPrimary?: (photoId: string) => void;
  showControls?: boolean;
  isDragMode?: boolean;
}

// Validation constants
export const ROOM_PHOTO_LIMITS = {
  MAX_PHOTOS_PER_USER: 15,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  IMAGE_COMPRESSION: {
    MAX_WIDTH: 1200,
    QUALITY: 0.8
  }
} as const;

// Helper type for photo validation results
export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

// Extended user type to include room photos
export interface UserWithRoomPhotos {
  id: string;
  name: string;
  age?: number;
  location?: string;
  userType: 'seeker' | 'provider';
  profilePicture?: string;
  roomPhotos?: RoomPhoto[];
  primaryRoomPhoto?: RoomPhoto;
  roomPhotoCount?: number;
}