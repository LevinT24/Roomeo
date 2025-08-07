"use client"

import { useState } from "react"
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
        <Card className="w-full max-w-md border-4 border-red-500 shadow-[8px_8px_0px_0px_red] bg-red-100">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-500 border-4 border-red-700 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-red-700 mb-4">DELETE LISTING</h2>
            <p className="text-red-700 font-bold mb-6">
              Are you sure you want to delete "{listing.title}"? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                disabled={isUpdating}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black border-2 border-red-700 shadow-[4px_4px_0px_0px_red] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_red] transition-all"
              >
                {isUpdating ? "DELETING..." : "DELETE FOREVER"}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1 border-2 border-red-700 text-red-700 hover:bg-red-700 hover:text-white font-black"
                disabled={isUpdating}
              >
                CANCEL
              </Button>
            </div>
          </CardContent>
        </Card>
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
            <img
              src={listing.images[currentImageIndex]}
              alt={`${listing.title} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
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
    <Card className="group cursor-pointer overflow-hidden bg-[#F2F5F1] border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40]">
      <div className="relative">
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden">
          {hasImages ? (
            <>
              <img
                src={listing.images[currentImageIndex]}
                alt={listing.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
          <Badge className="absolute top-2 left-2 bg-red-600 text-white font-black border-2 border-white shadow-[2px_2px_0px_0px_#000]">
            SOLD
          </Badge>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-[#44C76F] border-2 border-white p-2 shadow-[2px_2px_0px_0px_#000]">
          <span className="text-sm font-black text-[#004D40]">{displayPrice}</span>
        </div>

        {/* Owner Actions Menu */}
        {isOwner && showOwnerActions && (
          <div className="absolute top-2 right-2">
            <div className="relative">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActionsMenu(!showActionsMenu)
                }}
                className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white border-none"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {showActionsMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowActionsMenu(false)}
                  />
                  <Card className="absolute right-0 top-full mt-1 w-48 border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] bg-[#F2F5F1] z-20">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {listing.status === 'active' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsSold()
                            }}
                            className="w-full justify-start bg-transparent hover:bg-[#44C76F]/20 text-[#004D40] font-black border-none text-sm p-2"
                            disabled={isUpdating}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            MARK AS SOLD
                          </Button>
                        )}
                        
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(listing)
                            setShowActionsMenu(false)
                          }}
                          className="w-full justify-start bg-transparent hover:bg-[#44C76F]/20 text-[#004D40] font-black border-none text-sm p-2"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          EDIT LISTING
                        </Button>
                        
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(true)
                            setShowActionsMenu(false)
                          }}
                          className="w-full justify-start bg-transparent hover:bg-red-100 text-red-600 font-black border-none text-sm p-2"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          DELETE
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="font-black text-[#004D40] text-lg leading-tight transform -skew-x-1 line-clamp-2">
            {listing.title}
          </h3>

          {/* Description */}
          {listing.description && (
            <p className="text-sm font-bold text-gray-700 line-clamp-2">
              {listing.description}
            </p>
          )}

          {/* Location & Date */}
          <div className="flex items-center justify-between text-sm">
            {listing.location && (
              <div className="flex items-center gap-1 text-gray-600 font-bold">
                <MapPin className="h-3 w-3" />
                <span>{listing.location}</span>
              </div>
            )}
            <span className="text-gray-500 font-bold text-xs">
              {formatDate(listing.created_at)}
            </span>
          </div>

          {/* Seller Info */}
          {listing.seller && (
            <div className="flex items-center gap-2 py-2 border-t border-gray-200">
              <div className="w-6 h-6 bg-[#44C76F] border-2 border-[#004D40] rounded-full flex items-center justify-center">
                {listing.seller.profilePicture ? (
                  <img
                    src={listing.seller.profilePicture}
                    alt={listing.seller.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-3 w-3 text-[#004D40]" />
                )}
              </div>
              <span className="text-sm font-black text-[#004D40]">
                {isOwner ? 'You' : listing.seller.name}
              </span>
            </div>
          )}

          {/* Actions */}
          {!isOwner && listing.status === 'active' && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onChatWithSeller?.(listing.created_by, listing.id)
              }}
              className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black border-2 border-[#44C76F] shadow-[2px_2px_0px_0px_#44C76F] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#44C76F] transition-all"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              CHAT WITH SELLER
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}