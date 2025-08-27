"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Home,
  Briefcase,
  Coffee,
  Cigarette,
  Wine,
  Dog,
  User,
  Crown,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { RoommateProfile, MatchType } from "@/types/roommate"

interface ProfileModalProps {
  profile: RoommateProfile | null
  isOpen: boolean
  onClose: () => void
  onMatchAction?: (profileId: string, action: MatchType) => void
  onStartChat?: (profileId: string) => void
  loading?: boolean
}

export default function ProfileModal({
  profile,
  isOpen,
  onClose,
  onMatchAction,
  onStartChat,
  loading = false
}: ProfileModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!profile) return null

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

  const handleStartChat = () => {
    if (onStartChat) {
      onStartChat(profile.id)
    }
  }

  const formatBudget = (min?: number, max?: number) => {
    if (min && max) return `$${min} - $${max}`
    if (min) return `$${min}+`
    if (max) return `Up to $${max}`
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className={`
          ${isProvider 
            ? 'bg-gradient-to-br from-amber-50 to-white' 
            : 'bg-white'
          }
        `}>
          {/* Header */}
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-4">
                  {profile.profilepicture ? (
                    <Image
                      src={profile.profilepicture}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                      width={64}
                      height={64}
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <h2 className="text-2xl font-bold text-gray-900 mr-2">
                      {profile.name}
                    </h2>
                    {isProvider && <Crown className="w-5 h-5 text-amber-500" />}
                    {profile.is_mutual_match && <BadgeCheck className="w-5 h-5 text-green-500 ml-1" />}
                  </div>
                  <p className="text-gray-600 mb-1">
                    {profile.age ? `${profile.age} years old` : 'Age not specified'}
                  </p>
                  {profile.location && (
                    <div className="flex items-center text-gray-500">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{profile.location}</span>
                      {profile.distance && (
                        <span className="ml-2">• {profile.distance} miles away</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Content Tabs */}
          <Tabs defaultValue="about" className="px-6">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="about">About</TabsTrigger>
              {isProvider && <TabsTrigger value="room">Room Details</TabsTrigger>}
              {!isProvider && <TabsTrigger value="preferences">Preferences</TabsTrigger>}
              <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              {/* Room Images (Provider only) */}
              {isProvider && images.length > 0 && (
                <div className="relative h-80 bg-gray-100 rounded-lg overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full"
                    >
                      <Image
                        src={images[currentImageIndex]?.image_url}
                        alt={`Room ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                        width={800}
                        height={320}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}

                  {images[currentImageIndex]?.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <p className="text-white text-sm">{images[currentImageIndex].caption}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600">
                  <Briefcase className="w-4 h-4 mr-3" />
                  <div>
                    <p className="font-medium">Profession</p>
                    <p className="text-sm">{profile.profession || 'Not specified'}</p>
                  </div>
                </div>

                {profile.user_role === 'seeker' && formatBudget(profile.budget_min, profile.budget_max) && (
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-3" />
                    <div>
                      <p className="font-medium">Budget</p>
                      <p className="text-sm">{formatBudget(profile.budget_min, profile.budget_max)}</p>
                    </div>
                  </div>
                )}

                {profile.gender && (
                  <div className="flex items-center text-gray-600">
                    <User className="w-4 h-4 mr-3" />
                    <div>
                      <p className="font-medium">Gender</p>
                      <p className="text-sm capitalize">{profile.gender}</p>
                    </div>
                  </div>
                )}

                {(profile.religion || profile.ethnicity) && (
                  <div className="flex items-center text-gray-600">
                    <User className="w-4 h-4 mr-3" />
                    <div>
                      <p className="font-medium">Background</p>
                      <p className="text-sm">
                        {[profile.religion, profile.ethnicity].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">About Me</h3>
                  <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Hobbies */}
              {profile.hobbies && profile.hobbies.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Hobbies & Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby, index) => (
                      <Badge key={index} variant="outline">
                        {hobby}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Room Details Tab (Provider only) */}
            {isProvider && profile.room_details && (
              <TabsContent value="room" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Room Type</h3>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        <Home className="w-3 h-3 mr-1" />
                        {profile.room_details.room_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Monthly Rent</h3>
                      <div className="flex items-center text-green-600 font-medium">
                        <DollarSign className="w-4 h-4 mr-1" />
                        ${profile.room_details.rent_amount}/month
                      </div>
                    </div>

                    {profile.room_details.deposit_amount && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Security Deposit</h3>
                        <p className="text-gray-600">${profile.room_details.deposit_amount}</p>
                      </div>
                    )}

                    {profile.room_details.available_from && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Available From</h3>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(profile.room_details.available_from).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Features</h3>
                      <div className="space-y-1">
                        <div className={`flex items-center text-sm ${profile.room_details.furnished ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${profile.room_details.furnished ? 'bg-green-500' : 'bg-gray-300'}`} />
                          Furnished
                        </div>
                        <div className={`flex items-center text-sm ${profile.room_details.utilities_included ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${profile.room_details.utilities_included ? 'bg-green-500' : 'bg-gray-300'}`} />
                          Utilities Included
                        </div>
                      </div>
                    </div>

                    {profile.room_details.lease_duration && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Lease Duration</h3>
                        <p className="text-gray-600 capitalize">
                          {profile.room_details.lease_duration.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                {profile.room_details.address && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                    <div className="flex items-start text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>{profile.room_details.address}</p>
                        {profile.room_details.neighborhood && (
                          <p className="text-sm text-gray-500">
                            {profile.room_details.neighborhood} neighborhood
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {profile.room_details.amenities && profile.room_details.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {profile.room_details.amenities.map((amenity, index) => (
                        <Badge 
                          key={index} 
                          variant="outline"
                          className="bg-amber-50 border-amber-200 text-amber-700 justify-center"
                        >
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* House Rules */}
                {profile.room_details.house_rules && profile.room_details.house_rules.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">House Rules</h3>
                    <ul className="space-y-1">
                      {profile.room_details.house_rules.map((rule, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                {profile.room_details.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-600 leading-relaxed">{profile.room_details.description}</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Preferences Tab (Seeker only) */}
            {!isProvider && profile.seeker_preferences && (
              <TabsContent value="preferences" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {profile.seeker_preferences.preferred_gender && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Preferred Gender</h3>
                      <p className="text-gray-600 capitalize">{profile.seeker_preferences.preferred_gender}</p>
                    </div>
                  )}

                  {(profile.seeker_preferences.age_range_min || profile.seeker_preferences.age_range_max) && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Age Range</h3>
                      <p className="text-gray-600">
                        {profile.seeker_preferences.age_range_min || 18} - {profile.seeker_preferences.age_range_max || 65} years
                      </p>
                    </div>
                  )}

                  {profile.seeker_preferences.max_budget && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Max Budget</h3>
                      <div className="flex items-center text-green-600 font-medium">
                        <DollarSign className="w-4 h-4 mr-1" />
                        ${profile.seeker_preferences.max_budget}/month
                      </div>
                    </div>
                  )}

                  {profile.seeker_preferences.preferred_location && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Preferred Location</h3>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {profile.seeker_preferences.preferred_location}
                      </div>
                    </div>
                  )}

                  {profile.seeker_preferences.preferred_room_type && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Preferred Room Type</h3>
                      <Badge variant="outline">
                        <Home className="w-3 h-3 mr-1" />
                        {profile.seeker_preferences.preferred_room_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Deal Breakers */}
                {profile.seeker_preferences.deal_breakers && profile.seeker_preferences.deal_breakers.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Deal Breakers</h3>
                    <div className="space-y-2">
                      {profile.seeker_preferences.deal_breakers.map((item, index) => (
                        <div key={index} className="flex items-center text-red-600 text-sm">
                          <X className="w-3 h-3 mr-2" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Lifestyle Tab */}
            <TabsContent value="lifestyle" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {profile.smoking && (
                    <div className="flex items-center">
                      <Cigarette className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Smoking</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {profile.smoking === 'no' ? 'Non-smoker' : profile.smoking}
                        </p>
                      </div>
                    </div>
                  )}

                  {profile.drinking && (
                    <div className="flex items-center">
                      <Wine className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Drinking</p>
                        <p className="text-sm text-gray-600 capitalize">{profile.drinking}</p>
                      </div>
                    </div>
                  )}

                  {profile.pets && (
                    <div className="flex items-center">
                      <Dog className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Pets</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {profile.pets === 'yes' ? 'Pet owner' : profile.pets}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex space-x-3">
              {profile.is_mutual_match ? (
                <Button
                  onClick={handleStartChat}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Chat
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleMatchAction('pass')}
                    disabled={loading}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Pass
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleMatchAction('super_like')}
                    disabled={loading}
                    className="px-6 border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                  >
                    <Star className="w-4 h-4" />
                  </Button>

                  <Button
                    onClick={() => handleMatchAction('like')}
                    disabled={loading}
                    className={`flex-1 ${
                      isProvider 
                        ? 'bg-amber-600 hover:bg-amber-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {loading ? 'Loading...' : 'Like'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}