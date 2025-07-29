"use client"

import { useState } from 'react';
import ImageUpload from '@/components/ui/ImageUpload';
import { useAuth } from '@/hooks/useAuth';

export default function UploadDemo() {
  const { user } = useAuth();
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadSuccess = (url: string) => {
    setUploadedUrl(url);
    setUploadError(null);
    console.log('🎉 Upload successful:', url);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadedUrl(null);
    console.error('❌ Upload error:', error);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#004D40] mb-4">Please sign in to test image upload</h1>
          <p className="text-[#004D40] font-bold">You need to be authenticated to upload images.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex flex-col">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b-4 border-[#004D40] bg-[#004D40]">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#44C76F] border-4 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[4px_4px_0px_0px_#F2F5F1]">
            <span className="text-[#004D40] font-black text-xl transform -rotate-3">R</span>
          </div>
          <span className="font-black text-2xl tracking-tight transform -skew-x-6 text-[#F2F5F1]">ROOMIO</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-[#004D40] mb-4 transform -skew-x-2">
              IMAGE UPLOAD DEMO
            </h1>
            <div className="w-24 h-2 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            <p className="text-lg font-bold text-[#004D40]">
              Test the image upload functionality with Supabase Storage
            </p>
          </div>

          <div className="bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-[#004D40] mb-2">
                User Information
              </h2>
              <div className="text-sm font-bold text-[#004D40] space-y-1">
                <p>User ID: {user.id}</p>
                <p>Email: {user.email}</p>
                <p>Name: {user.name}</p>
              </div>
            </div>

            <div className="border-t-4 border-[#004D40] pt-6">
              <ImageUpload
                userId={user.id}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                currentImageUrl={user.profilePicture || undefined}
              />
            </div>

            {/* Upload Results */}
            {uploadedUrl && (
              <div className="mt-6 p-4 bg-green-100 border-2 border-green-500 rounded">
                <h3 className="font-black text-green-700 mb-2">Upload Results:</h3>
                <div className="text-sm font-bold text-green-700 space-y-2">
                  <p>Status: ✅ Success</p>
                  <p>URL: {uploadedUrl}</p>
                  <div className="mt-4">
                    <img 
                      src={uploadedUrl} 
                      alt="Uploaded image" 
                      className="w-24 h-24 object-cover rounded-full border-2 border-green-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mt-6 p-4 bg-red-100 border-2 border-red-500 rounded">
                <h3 className="font-black text-red-700 mb-2">Upload Error:</h3>
                <p className="text-sm font-bold text-red-700">{uploadError}</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-6">
            <h3 className="text-xl font-black text-[#004D40] mb-4 text-center">
              How It Works
            </h3>
            <div className="text-sm font-bold text-[#004D40] space-y-2">
              <p>1. Click "UPLOAD PROFILE PICTURE" to select an image</p>
              <p>2. The image is validated (type and size)</p>
              <p>3. A preview is shown immediately</p>
              <p>4. The image uploads to Supabase Storage (avatars bucket)</p>
              <p>5. The file overwrites any existing image for this user</p>
              <p>6. A public URL is returned for display</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 