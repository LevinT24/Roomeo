"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  getRoomPhotos, 
  deleteRoomPhoto, 
  setPrimaryPhoto, 
  updatePhotoCaption, 
  reorderPhotos 
} from '@/services/roomPhotos';
import { RoomPhoto } from '@/types/roomPhotos';
import RoomPhotoUpload from './RoomPhotoUpload';

interface RoomPhotoManagerProps {
  userId?: string;
  onClose?: () => void;
}

export default function RoomPhotoManager({ userId, onClose }: RoomPhotoManagerProps) {
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [tempCaption, setTempCaption] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch photos on component mount
  useEffect(() => {
    fetchPhotos();
  }, [userId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedPhotos = await getRoomPhotos(userId);
      setPhotos(fetchedPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      const result = await deleteRoomPhoto(photoId);
      if (result.success) {
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      } else {
        setError(result.message || 'Failed to delete photo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  // Handle setting primary photo
  const handleSetPrimary = async (photoId: string) => {
    try {
      const result = await setPrimaryPhoto(photoId);
      if (result.success) {
        // Update photos to reflect new primary
        setPhotos(prev => prev.map(photo => ({
          ...photo,
          is_primary: photo.id === photoId
        })));
      } else {
        setError(result.message || 'Failed to set primary photo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary photo');
    }
  };

  // Handle caption editing
  const startEditingCaption = (photo: RoomPhoto) => {
    setEditingCaption(photo.id);
    setTempCaption(photo.caption || '');
  };

  const saveCaption = async () => {
    if (!editingCaption) return;

    try {
      const result = await updatePhotoCaption(editingCaption, tempCaption);
      if (result.success) {
        // Update photos with new caption
        setPhotos(prev => prev.map(photo => 
          photo.id === editingCaption 
            ? { ...photo, caption: tempCaption }
            : photo
        ));
        setEditingCaption(null);
        setTempCaption('');
      } else {
        setError(result.message || 'Failed to update caption');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update caption');
    }
  };

  const cancelEditingCaption = () => {
    setEditingCaption(null);
    setTempCaption('');
  };

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create new order
    const newPhotos = [...photos];
    const draggedPhoto = newPhotos[draggedIndex];
    
    // Remove dragged item and insert at new position
    newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(dropIndex, 0, draggedPhoto);
    
    // Update display order
    const reorderedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      display_order: index + 1
    }));
    
    setPhotos(reorderedPhotos);
    
    try {
      // Save new order to database
      const photoIds = reorderedPhotos.map(photo => photo.id);
      const result = await reorderPhotos(photoIds);
      if (!result.success) {
        setError(result.message || 'Failed to save new photo order');
        // Revert order on error
        fetchPhotos();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder photos');
      fetchPhotos();
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Handle new photos uploaded
  const handlePhotosUploaded = (newPhotos: RoomPhoto[]) => {
    setPhotos(prev => [...prev, ...newPhotos]);
    setShowUpload(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#44C76F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#004D40] font-bold">Loading your room photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#004D40] tracking-tight">ROOM PHOTOS</h2>
          <p className="text-[#004D40] font-bold">Manage your space photos ({photos.length}/15)</p>
        </div>
        
        <div className="flex gap-3">
          {photos.length < 15 && (
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className="bg-[#44C76F] text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
            >
              {showUpload ? 'CANCEL UPLOAD' : 'ADD PHOTOS'}
            </Button>
          )}
          
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="font-bold"
            >
              CLOSE
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-4 border-red-500 bg-red-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-black">⚠️</span>
            <span className="font-black text-red-700">ERROR</span>
          </div>
          <p className="text-red-700 font-bold text-sm">{error}</p>
          <button 
            onClick={() => setError('')}
            className="mt-2 text-red-600 hover:text-red-800 font-bold text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Section */}
      {showUpload && (
        <Card className="border-4 border-[#44C76F] shadow-[4px_4px_0px_0px_#44C76F]">
          <CardContent className="p-6">
            <RoomPhotoUpload
              onPhotosUploaded={handlePhotosUploaded}
              maxPhotos={15}
              existingPhotos={photos}
            />
          </CardContent>
        </Card>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-black text-[#004D40] mb-2">NO ROOM PHOTOS YET</h3>
          <p className="text-[#004D40] font-bold mb-6">Upload some photos to showcase your space!</p>
          <Button
            onClick={() => setShowUpload(true)}
            className="bg-[#44C76F] text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
          >
            UPLOAD PHOTOS
          </Button>
        </div>
      ) : (
        <div>
          {/* Drag and Drop Instructions */}
          <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-blue-700 font-bold text-sm">
              💡 Drag and drop photos to reorder them. The first photo will be your primary display photo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos
              .sort((a, b) => a.display_order - b.display_order)
              .map((photo, index) => (
                <Card
                  key={photo.id}
                  className={`border-4 overflow-hidden transition-all cursor-move ${
                    photo.is_primary 
                      ? 'border-[#44C76F] shadow-[4px_4px_0px_0px_#44C76F]'
                      : 'border-[#004D40] shadow-[2px_2px_0px_0px_#004D40]'
                  } ${
                    dragOverIndex === index ? 'transform scale-105 shadow-lg' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="relative">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || `Room photo ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    
                    {/* Primary Badge */}
                    {photo.is_primary && (
                      <div className="absolute top-2 left-2 bg-[#44C76F] text-[#004D40] px-2 py-1 rounded font-black text-xs">
                        PRIMARY
                      </div>
                    )}
                    
                    {/* Order Number */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                      {index + 1}
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  
                  <CardContent className="p-4 space-y-3">
                    {/* Caption Editing */}
                    {editingCaption === photo.id ? (
                      <div className="space-y-2">
                        <Input
                          value={tempCaption}
                          onChange={(e) => setTempCaption(e.target.value)}
                          placeholder="Add a caption..."
                          className="font-bold border-2 border-[#004D40]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCaption();
                            if (e.key === 'Escape') cancelEditingCaption();
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={saveCaption}
                            size="sm"
                            className="bg-[#44C76F] text-[#004D40] font-bold"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEditingCaption}
                            size="sm"
                            variant="outline"
                            className="font-bold"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditingCaption(photo)}
                        className="cursor-pointer p-2 border border-gray-200 rounded min-h-[40px] flex items-center hover:bg-gray-50"
                      >
                        <p className="text-[#004D40] font-bold text-sm">
                          {photo.caption || 'Click to add caption...'}
                        </p>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    {!photo.is_primary && (
                      <Button
                        onClick={() => handleSetPrimary(photo.id)}
                        size="sm"
                        variant="outline"
                        className="w-full font-bold text-[#004D40] border-[#004D40] hover:bg-[#44C76F]"
                      >
                        SET AS PRIMARY
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}