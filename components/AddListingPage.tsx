"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { X, Upload, ImageIcon, AlertCircle, Check } from "lucide-react"
import { createListing, uploadListingImage } from "@/services/marketplace"
import type { ListingFormData, ListingFormErrors } from "@/types/listing"
import type { User } from "@/types/user"

interface AddListingPageProps {
  user: User
  onSuccess: () => void
  onCancel: () => void
}

export default function AddListingPage({ user, onSuccess, onCancel }: AddListingPageProps) {
  const [formData, setFormData] = useState<ListingFormData>({
    title: "",
    description: "",
    price: "",
    location: "",
    images: [],
    imageUrls: []
  })
  
  const [errors, setErrors] = useState<ListingFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: ListingFormErrors = {}

    // Title is required
    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters"
    }

    // Price validation (optional but if provided, must be valid)
    if (formData.price && formData.price.trim()) {
      const priceNum = parseFloat(formData.price)
      if (isNaN(priceNum) || priceNum < 0) {
        newErrors.price = "Price must be a valid positive number"
      }
    }

    // Description length limit
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = "Description must be less than 1000 characters"
    }

    // Location length limit
    if (formData.location && formData.location.length > 100) {
      newErrors.location = "Location must be less than 100 characters"
    }

    // Image limit
    if (formData.images.length > 5) {
      newErrors.images = "Maximum 5 images allowed"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ListingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (field !== 'images' && field !== 'imageUrls' && errors[field as keyof ListingFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (files.length === 0) return
    
    // Check total image count
    if (formData.images.length + files.length > 5) {
      setErrors(prev => ({ ...prev, images: "Maximum 5 images allowed" }))
      return
    }

    // Check file types and sizes
    const validFiles: File[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, images: "Only image files are allowed" }))
        continue
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, images: "Images must be less than 5MB" }))
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      // Create preview URLs
      const newImageUrls = validFiles.map(file => URL.createObjectURL(file))
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles],
        imageUrls: [...prev.imageUrls, ...newImageUrls]
      }))

      // Clear image errors
      setErrors(prev => ({ ...prev, images: undefined }))
    }
  }

  const removeImage = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(formData.imageUrls[index])
    
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      console.log("🔄 Starting listing creation process...")

      // Upload images first
      let imageUrls: string[] = []
      if (formData.images.length > 0) {
        setIsUploadingImages(true)
        console.log("🔄 Uploading images:", formData.images.length)
        
        try {
          // Add timeout protection to the entire upload process
          const uploadPromises = formData.images.map(file => uploadListingImage(file))
          const uploadTimeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Upload process timeout - please try again with fewer or smaller images')), 30000)
          )
          
          imageUrls = await Promise.race([
            Promise.all(uploadPromises),
            uploadTimeout
          ])
          
          console.log("✅ Uploaded images:", imageUrls.length)
          setIsUploadingImages(false)
        } catch (uploadError) {
          console.error("❌ Image upload failed:", uploadError)
          setIsUploadingImages(false)
          
          // Ask user if they want to continue without images
          const continueWithoutImages = window.confirm(
            "Image upload failed. Would you like to create the listing without images? You can add images later by editing the listing."
          )
          
          if (!continueWithoutImages) {
            setErrors({ images: uploadError instanceof Error ? uploadError.message : "Image upload failed" })
            return
          }
          
          console.log("🔄 Continuing without images...")
          imageUrls = []
        }
      }

      // Create listing with uploaded image URLs
      const listingData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        price: formData.price.trim() ? parseFloat(formData.price) : undefined,
        location: formData.location.trim() || undefined,
        images: imageUrls
      }

      console.log("🔄 Creating listing with data:", listingData)
      const newListing = await createListing(listingData)
      
      console.log("✅ Created listing:", newListing.id)
      
      // Clean up object URLs
      formData.imageUrls.forEach(url => URL.revokeObjectURL(url))
      
      // Success - redirect to marketplace
      onSuccess()

    } catch (error) {
      console.error("❌ Error creating listing:", error)
      setErrors({ 
        general: error instanceof Error ? error.message : "Failed to create listing. Please try again." 
      })
    } finally {
      setIsSubmitting(false)
      setIsUploadingImages(false)
    }
  }

  const currentImageCount = formData.images.length
  const maxImages = 5

  return (
    <div className="min-h-screen bg-[#F2F5F1] pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-black text-[#004D40] transform -skew-x-2">ADD LISTING</h1>
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black"
            >
              <X className="h-4 w-4 mr-2" />
              CANCEL
            </Button>
          </div>
          <div className="w-20 h-2 bg-[#44C76F] transform skew-x-12"></div>
        </div>

        {/* Form */}
        <Card className="border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-100 border-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-black text-red-700">{errors.general}</span>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">
                  TITLE *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="What are you selling?"
                  className={`border-2 font-bold ${
                    errors.title ? 'border-red-500' : 'border-[#004D40]'
                  } focus:border-[#44C76F]`}
                  maxLength={100}
                />
                {errors.title && (
                  <p className="text-red-600 text-sm font-bold mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your item (optional)"
                  rows={4}
                  className={`w-full border-2 font-bold p-3 rounded-lg ${
                    errors.description ? 'border-red-500' : 'border-[#004D40]'
                  } focus:border-[#44C76F] focus:outline-none resize-none`}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description && (
                    <p className="text-red-600 text-sm font-bold">{errors.description}</p>
                  )}
                  <p className="text-sm text-gray-600 font-bold ml-auto">
                    {formData.description.length}/1000
                  </p>
                </div>
              </div>

              {/* Price and Location Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-2">
                    PRICE ($)
                  </label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`border-2 font-bold ${
                      errors.price ? 'border-red-500' : 'border-[#004D40]'
                    } focus:border-[#44C76F]`}
                  />
                  {errors.price && (
                    <p className="text-red-600 text-sm font-bold mt-1">{errors.price}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-2">
                    LOCATION
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, State"
                    className={`border-2 font-bold ${
                      errors.location ? 'border-red-500' : 'border-[#004D40]'
                    } focus:border-[#44C76F]`}
                    maxLength={100}
                  />
                  {errors.location && (
                    <p className="text-red-600 text-sm font-bold mt-1">{errors.location}</p>
                  )}
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">
                  IMAGES ({currentImageCount}/{maxImages})
                </label>
                
                {/* Upload Button */}
                {currentImageCount < maxImages && (
                  <div className="mb-4">
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-[#004D40] rounded-lg p-8 text-center hover:border-[#44C76F] hover:bg-[#44C76F]/10 transition-colors">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-[#004D40]" />
                        <p className="font-bold text-[#004D40]">
                          Click to upload images
                        </p>
                        <p className="text-sm text-gray-600 font-bold mt-1">
                          Max 5 images, 5MB each
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isSubmitting || isUploadingImages}
                      />
                    </label>
                  </div>
                )}

                {/* Image Previews */}
                {formData.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {formData.imageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-[#004D40]">
                          <Image
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                            width={200}
                            height={200}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white border-2 border-white shadow-lg"
                          disabled={isSubmitting || isUploadingImages}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.images && (
                  <p className="text-red-600 text-sm font-bold">{errors.images}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isUploadingImages}
                  className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black px-6 py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingImages ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      UPLOADING IMAGES...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-[#004D40] border-t-transparent rounded-full animate-spin" />
                      CREATING LISTING...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      CREATE LISTING
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="outline"
                  className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black px-6"
                  disabled={isSubmitting || isUploadingImages}
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}