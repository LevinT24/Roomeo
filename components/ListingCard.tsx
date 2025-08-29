"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  MessageCircle, 
  Edit, 
  Trash2, 
  Check, 
  MapPin, 
  User as UserIcon,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react"
import { markListingAsSold, deleteListing } from "@/services/marketplace"
import type { Listing } from "@/types/listing"
import type { User } from "@/types/user"

interface ListingCardProps {
  listing: Listing
  currentUser: User
  onChatWithSeller?: (sellerId: string, listingId: string) => void
  onEdit?: (listing: Listing) => void
  onDelete?: (listingId: string) => void
  onUpdate?: () => void // Callback to refresh the listing data
  showOwnerActions?: boolean
}

export default function ListingCard({ 
  listing, 
  currentUser, 
  onChatWithSeller,
  onEdit,
  onDelete,
  onUpdate,
  showOwnerActions = true
}: ListingCardProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showImageModal, setShowImageModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isOwner = currentUser.id === listing.created_by
  const hasImages = listing.images && listing.images.length > 0
  const displayPrice = listing.price ? `$${listing.price.toFixed(2)}` : "Free"

  const handleMarkAsSold = async () => {
    if (!isOwner) return
    
    setIsUpdating(true)
    try {
      await markListingAsSold(listing.id)
      onUpdate?.()
      setShowActionsMenu(false)
    } catch (error) {
      console.error("Error marking as sold:", error)
      alert("Failed to mark as sold. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwner) return
    
    setIsUpdating(true)
    try {
      await deleteListing(listing.id)
      onDelete?.(listing.id)
      setShowDeleteConfirm(false)
      setShowActionsMenu(false)
    } catch (error) {
      console.error("Error deleting listing:", error)
      alert("Failed to delete listing. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const nextImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length)
    }
  }

  const prevImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md roomeo-card">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-alert-red rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="roomeo-heading text-2xl mb-4">Delete Listing</h2>
            <p className="roomeo-body text-emerald-primary/70 mb-8">
              Are you sure you want to delete &quot;{listing.title}&quot;? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isUpdating}
                className="flex-1 bg-alert-red hover:bg-alert-red/90 text-white roomeo-body font-semibold px-6 py-3 rounded-xl shadow-soft transition-all transform hover:scale-105"
              >
                {isUpdating ? "Deleting..." : "Delete Forever"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 roomeo-button-secondary"
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Image modal
  if (showImageModal && hasImages) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="relative max-w-4xl max-h-full">
          <Button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-none p-2"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="relative">
            <Image
              src={listing.images[currentImageIndex]}
              alt={`${listing.title} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
              width={800}
              height={600}
            />
            
            {listing.images.length > 1 && (
              <>
                <Button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none p-2"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white border-none p-2"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full font-bold">
                  {currentImageIndex + 1} / {listing.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`roomeo-card group cursor-pointer overflow-hidden ${listing.status === 'sold' ? 'opacity-70' : ''}`}>
      <div className="relative">
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* Sold Overlay */}
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-gray-600/50 z-[5] flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-gray-800 font-bold text-lg">SOLD</span>
              </div>
            </div>
          )}
          {hasImages ? (
            <>
              <Image
                src={listing.images[currentImageIndex]}
                alt={listing.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                width={400}
                height={400}
                onClick={() => setShowImageModal(true)}
              />
              
              {/* Image Navigation */}
              {listing.images.length > 1 && (
                <>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      prevImage()
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white border-none opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextImage()
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white border-none opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  {/* Image Dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {listing.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(index)
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <UserIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="font-bold text-sm">No Image</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {listing.status === 'sold' && (
          <Badge className="absolute top-2 left-2 bg-alert-red text-white roomeo-body font-semibold px-3 py-1 z-20">
            SOLD
          </Badge>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3 flex items-center justify-center rounded-xl bg-emerald-primary border-2 border-white px-4 py-2 shadow-soft">
          <span className="roomeo-body text-base font-bold text-gold-accent">{displayPrice}</span>
        </div>

        {/* Owner Actions Menu */}
        {isOwner && showOwnerActions && (
          <div className="absolute top-2 right-2 z-10">
            <div className="relative">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActionsMenu(!showActionsMenu)
                }}
                className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white border-none z-10"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {showActionsMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowActionsMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 roomeo-card z-20">
                    <div className="p-3">
                      <div className="space-y-1">
                        {listing.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsSold()
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 roomeo-body text-emerald-primary hover:bg-moss-green/10 rounded-lg transition-colors"
                            disabled={isUpdating}
                          >
                            <Check className="h-4 w-4" />
                            Mark as Sold
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(listing)
                            setShowActionsMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 roomeo-body text-emerald-primary hover:bg-moss-green/10 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Listing
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(true)
                            setShowActionsMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 roomeo-body text-alert-red hover:bg-alert-red/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={`p-5 md:p-6 ${listing.status === 'sold' ? 'text-gray-500' : ''}`}>
        <div className="space-y-4">
          {/* Title */}
          <h3 className="roomeo-heading text-xl leading-tight line-clamp-2 min-h-[3.5rem] flex items-start">
            {listing.title}
          </h3>

          {/* Description */}
          {listing.description && (
            <p className="roomeo-body text-emerald-primary/70 text-base line-clamp-3 min-h-[4.5rem]">
              {listing.description}
            </p>
          )}

          {/* Location & Date */}
          <div className="flex items-center justify-between text-sm">
            {listing.location && (
              <div className="flex items-center gap-1 roomeo-body text-emerald-primary/60">
                <MapPin className="h-3 w-3" />
                <span>{listing.location}</span>
              </div>
            )}
            <span className="roomeo-body text-emerald-primary/50 text-xs">
              {formatDate(listing.created_at)}
            </span>
          </div>

          {/* Seller Info */}
          {listing.seller && (
            <div className="flex items-center gap-3 py-3 border-t border-sage/30">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border-2 border-sage/30"
                style={{
                  backgroundImage: `url("${listing.seller.profilePicture || "/placeholder.svg?height=32&width=32"}")`,
                }}
              ></div>
              <span className="roomeo-body font-semibold text-emerald-primary">
                {isOwner ? 'You' : listing.seller.name}
              </span>
            </div>
          )}

          {/* Actions */}
          {!isOwner && (
            <>
              {listing.status === 'active' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onChatWithSeller?.(listing.created_by, listing.id)
                  }}
                  className="w-full roomeo-button-primary flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat with Seller</span>
                </button>
              )}
              {listing.status === 'sold' && (
                <div className="w-full bg-gray-300 text-gray-500 flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-not-allowed">
                  <Check className="h-4 w-4" />
                  <span>Item Sold</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}