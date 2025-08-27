"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Heart, 
  X, 
  Star, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Home,
  User,
  Briefcase,
  Coffee,
  Cigarette,
  Wine,
  Dog,
  ChevronLeft,
  ChevronRight,
  Crown,
  BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { RoommateProfile, MatchType } from "@/types/roommate"

interface ProfileCardProps {
  profile: RoommateProfile
  onMatchAction?: (profileId: string, action: MatchType) => void
  loading?: boolean
  showActions?: boolean
  compact?: boolean
}

export default function ProfileCard({ 
  profile, 
  onMatchAction, 
  loading = false, 
  showActions = true,
  compact = false 
}: ProfileCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullBio, setShowFullBio] = useState(false)

  const isProvider = profile.user_role === 'provider'
  const images = profile.room_images?.sort((a, b) => a.image_order - b.image_order) || []

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }
  }

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  const handleMatchAction = (action: MatchType) => {
    if (onMatchAction) {
      onMatchAction(profile.id, action)
    }
  }

  const formatBudget = (min?: number, max?: number) => {
    if (min && max) return `$${min} - $${max}`
    if (min) return `$${min}+`
    if (max) return `Up to $${max}`
    return null
  }

  const getAgeDisplay = () => {
    return profile.age ? `${profile.age} years old` : 'Age not specified'
  }

  const cardClassName = `
    relative overflow-hidden transition-all duration-300 hover:scale-[1.02] group
    ${compact ? 'max-w-sm' : 'max-w-md w-full'}
    ${isProvider 
      ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-amber-100/50' 
      : 'bg-white border-gray-200 shadow-gray-100/50'
    }
    border-2 rounded-2xl shadow-xl
    ${profile.is_mutual_match ? 'ring-2 ring-green-400' : ''}
  `

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cardClassName}
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          {/* Images Section (Provider only) */}
          {isProvider && images.length > 0 && (
            <div className="relative h-64 bg-gray-100">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]?.image_url}
                  alt={`Room ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Image Indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Provider Crown */}
              <div className="absolute top-3 right-3">
                <div className="bg-amber-500 text-white rounded-full p-2 shadow-lg">
                  <Crown className="w-4 h-4" />
                </div>
              </div>

              {/* Mutual Match Badge */}
              {profile.is_mutual_match && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-green-500 text-white">
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    Match!
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Profile Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h3 className="text-xl font-bold text-gray-900 mr-2">
                    {profile.name}
                  </h3>
                  {isProvider && (
                    <Crown className="w-4 h-4 text-amber-500" />
                  )}
                  {profile.is_mutual_match && (
                    <BadgeCheck className="w-4 h-4 text-green-500 ml-1" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">{getAgeDisplay()}</p>
                {profile.location && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-3 h-3 mr-1" />
                    {profile.location}
                    {profile.distance && (
                      <span className="ml-2">• {profile.distance} miles away</span>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Picture */}
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile.profilepicture ? (
                  <Image
                    src={profile.profilepicture}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    width={400}
                    height={500}
                  />
                ) : (
                  <User className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Briefcase className="w-3 h-3 mr-2" />
                <span className="truncate">{profile.profession || 'Not specified'}</span>
              </div>
              
              {profile.user_role === 'provider' && profile.room_details && (
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="w-3 h-3 mr-2" />
                  <span>${profile.room_details.rent_amount}/month</span>
                </div>
              )}

              {profile.user_role === 'seeker' && formatBudget(profile.budget_min, profile.budget_max) && (
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="w-3 h-3 mr-2" />
                  <span>{formatBudget(profile.budget_min, profile.budget_max)}</span>
                </div>
              )}

              {profile.user_role === 'provider' && profile.room_details?.available_from && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-3 h-3 mr-2" />
                  <span>Available {new Date(profile.room_details.available_from).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Room Type (Provider) */}
            {isProvider && profile.room_details && (
              <div className="mb-4">
                <Badge 
                  variant="secondary" 
                  className="bg-amber-100 text-amber-800 border-amber-200"
                >
                  <Home className="w-3 h-3 mr-1" />
                  {profile.room_details.room_type.replace('_', ' ')}
                </Badge>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <div className="mb-4">
                <p className={`text-sm text-gray-600 leading-relaxed ${
                  !showFullBio && profile.bio.length > 120 ? 'line-clamp-3' : ''
                }`}>
                  {profile.bio}
                </p>
                {profile.bio.length > 120 && (
                  <button
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                  >
                    {showFullBio ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Lifestyle Icons */}
            <div className="flex items-center space-x-4 mb-4">
              {profile.smoking && (
                <div className="flex items-center text-xs text-gray-500">
                  <Cigarette className="w-3 h-3 mr-1" />
                  <span className="capitalize">{profile.smoking === 'no' ? 'Non-smoker' : profile.smoking}</span>
                </div>
              )}
              {profile.drinking && (
                <div className="flex items-center text-xs text-gray-500">
                  <Wine className="w-3 h-3 mr-1" />
                  <span className="capitalize">{profile.drinking}</span>
                </div>
              )}
              {profile.pets && (
                <div className="flex items-center text-xs text-gray-500">
                  <Dog className="w-3 h-3 mr-1" />
                  <span className="capitalize">{profile.pets === 'yes' ? 'Pet owner' : profile.pets}</span>
                </div>
              )}
            </div>

            {/* Hobbies */}
            {profile.hobbies && profile.hobbies.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {profile.hobbies.slice(0, compact ? 3 : 5).map((hobby, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {hobby}
                    </Badge>
                  ))}
                  {profile.hobbies.length > (compact ? 3 : 5) && (
                    <Badge variant="outline" className="text-xs">
                      +{profile.hobbies.length - (compact ? 3 : 5)} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Room Amenities (Provider) */}
            {isProvider && profile.room_details?.amenities && profile.room_details.amenities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-1">
                  {profile.room_details.amenities.slice(0, 4).map((amenity, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs bg-amber-50 border-amber-200 text-amber-700"
                    >
                      {amenity}
                    </Badge>
                  ))}
                  {profile.room_details.amenities.length > 4 && (
                    <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                      +{profile.room_details.amenities.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {!compact && <Separator className="mb-4" />}

            {/* Action Buttons */}
            {showActions && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMatchAction('pass')}
                  disabled={loading}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <X className="w-4 h-4 mr-1" />
                  Pass
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMatchAction('super_like')}
                  disabled={loading}
                  className="px-3 border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                >
                  <Star className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleMatchAction('like')}
                  disabled={loading}
                  className={`flex-1 ${
                    isProvider 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  {loading ? 'Loading...' : 'Like'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decorative Elements */}
      {isProvider && (
        <>
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-amber-200/20 rounded-full -ml-8 -mb-8 pointer-events-none" />
        </>
      )}
    </motion.div>
  )
}