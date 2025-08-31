"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { RoomPhoto } from '@/types/roomPhotos';

interface PhotoGalleryModalProps {
  photos: RoomPhoto[];
  isOpen: boolean;
  onClose: () => void;
  initialPhotoIndex?: number;
  userName?: string;
  userAge?: number;
  userLocation?: string;
  userBudget?: number;
  userBio?: string;
  onLike?: () => void;
  onPass?: () => void;
}

export default function PhotoGalleryModal({
  photos,
  isOpen,
  onClose,
  initialPhotoIndex = 0,
  userName,
  userAge,
  userLocation,
  userBudget,
  userBio,
  onLike,
  onPass
}: PhotoGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset to initial index when modal opens or photos change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialPhotoIndex, photos.length - 1));
      setIsLoading(true);
    }
  }, [isOpen, initialPhotoIndex, photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
    setIsLoading(true);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
    setIsLoading(true);
  }, [photos.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        goToPrevious();
        break;
      case 'ArrowRight':
        goToNext();
        break;
    }
  }, [isOpen, onClose, goToPrevious, goToNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
    setIsLoading(true);
  };

  // Handle touch gestures for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && photos.length > 1) {
      goToNext();
    }
    if (isRightSwipe && photos.length > 1) {
      goToPrevious();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <div className="flex items-center space-x-4">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#44C76F] rounded-full flex items-center justify-center font-black text-[#004D40]">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-black text-lg">
                {userName || 'Provider'}{userAge ? `, ${userAge}` : ''}
              </h3>
              {userLocation && (
                <p className="text-sm font-bold opacity-80">📍 {userLocation}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Photo Counter */}
          <span className="font-black text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} of {photos.length}
          </span>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Photo Area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="relative w-full h-full flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Current Photo */}
          <Image
            src={currentPhoto.photo_url}
            alt={currentPhoto.caption || `Room photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            width={800}
            height={600}
          />

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Photo Caption */}
          {currentPhoto.caption && (
            <div className="absolute bottom-20 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
              <p className="font-bold text-sm">{currentPhoto.caption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip (if multiple photos) */}
      {photos.length > 1 && (
        <div className="bg-black/50 p-4">
          <div className="flex space-x-2 justify-center max-w-full overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => goToPhoto(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-[#44C76F] shadow-lg'
                    : 'border-white/30 hover:border-white/60'
                }`}
              >
                <Image
                  src={photo.photo_url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  width={64}
                  height={64}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Details & Actions */}
      <div className="bg-white p-6 space-y-4">
        {/* Provider Details */}
        <div className="space-y-2">
          {userBudget && (
            <div className="flex items-center text-[#004D40]">
              <span className="font-black text-sm mr-2">💰 BUDGET:</span>
              <span className="font-bold">${userBudget}/month</span>
            </div>
          )}
          
          {userBio && (
            <div className="text-[#004D40]">
              <span className="font-black text-sm block mb-1">📝 ABOUT:</span>
              <p className="font-bold text-sm leading-relaxed">{userBio}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(onLike || onPass) && (
          <div className="flex gap-4">
            {onPass && (
              <button
                onClick={() => {
                  onPass();
                  onClose();
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 px-6 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                PASS
              </button>
            )}
            
            {onLike && (
              <button
                onClick={() => {
                  onLike();
                  onClose();
                }}
                className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black py-3 px-6 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                LIKE ❤️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Background Click to Close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}