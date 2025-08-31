"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Edit3, Save, X, Camera, Upload, Check, Plus, Minus,
  User as UserIcon, MapPin, Briefcase, Heart, Home, Users, Volume2, 
  VolumeX, BookOpen, Calendar, Sparkles, Coffee, Music,
  Gamepad2, Dumbbell, Palette, Plane, Book
} from "lucide-react"
import { updateUserProfile } from "@/services/supabase"
import type { User, UserPreferences } from "@/types/user"

interface EnhancedProfileEditProps {
  user: User
  onClose: () => void
  onUpdate?: () => void
}

const preferenceIcons = {
  smoking: '🚬',
  drinking: '🍺',
  vegetarian: '🌱',
  pets: '🐕',
  quiet: '🤫',
  social: '🎉',
  organized: '📋',
  studious: '📚'
}

const hobbyEmojis = [
  '🎵', '🎮', '🏋️', '🎨', '✈️', '📚', '🍳', '🎭', '⚽', '🎸',
  '📷', '🧘', '🌱', '💻', '🎪', '🏃', '🎬', '🎨', '🍕', '☕'
]

const housingStatusConfig = {
  looking: { label: 'Looking for Place', color: 'bg-blue-500', icon: '🔍' },
  offering: { label: 'Offering Place', color: 'bg-green-500', icon: '🏠' },
  flexible: { label: 'Flexible', color: 'bg-purple-500', icon: '🤝' }
}

export default function EnhancedProfileEdit({ user, onClose, onUpdate }: EnhancedProfileEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>(user?.profilePicture || "")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [editData, setEditData] = useState({
    name: user?.name || "",
    age: user?.age || "",
    profession: user?.profession || "",
    bio: user?.bio || "",
    location: user?.location || "",
    budget: user?.budget || "",
    hobbies: user?.hobbies || [],
    housingStatus: user?.housingStatus || 'looking',
    preferences: user?.preferences || {
      smoking: false,
      drinking: false,
      vegetarian: false,
      pets: false,
      quiet: false,
      social: false,
      organized: false,
      studious: false
    }
  })

  useEffect(() => {
    setEditData({
      name: user?.name || "",
      age: user?.age || "",
      profession: user?.profession || "",
      bio: user?.bio || "",
      location: user?.location || "",
      budget: user?.budget || "",
      hobbies: user?.hobbies || [],
      housingStatus: user?.housingStatus || 'looking',
      preferences: user?.preferences || {
        smoking: false,
        drinking: false,
        vegetarian: false,
        pets: false,
        quiet: false,
        social: false,
        organized: false,
        studious: false
      }
    })
    setProfileImagePreview(user?.profilePicture || "")
  }, [user])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return

    setIsUpdating(true)
    try {
      // Handle image upload here if needed
      // For now, we'll just update the profile data
      
      const ageValue = editData.age ? parseInt(editData.age.toString()) : null
      const budgetValue = editData.budget ? parseInt(editData.budget.toString()) : null

      const updatePayload = {
        name: editData.name.trim(),
        age: ageValue,
        profession: editData.profession?.trim() || "",
        bio: editData.bio?.trim() || "",
        location: editData.location?.trim() || "",
        budget: budgetValue,
        hobbies: editData.hobbies,
        housingStatus: editData.housingStatus,
        preferences: editData.preferences
      }

      console.log("🔄 Sending update payload:", updatePayload)
      const success = await updateUserProfile(user.id, updatePayload)

      if (success) {
        alert("Profile updated successfully!")
        setIsEditing(false)
        onUpdate?.()
      } else {
        console.error("❌ Profile update failed")
        alert("Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const togglePreference = (key: keyof UserPreferences) => {
    setEditData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key]
      }
    }))
  }

  const addHobby = (hobby: string) => {
    if (!editData.hobbies.includes(hobby)) {
      setEditData(prev => ({
        ...prev,
        hobbies: [...prev.hobbies, hobby]
      }))
    }
  }

  const removeHobby = (hobby: string) => {
    setEditData(prev => ({
      ...prev,
      hobbies: prev.hobbies.filter(h => h !== hobby)
    }))
  }

  const renderProfilePreview = () => {
    const displayData = isEditing ? editData : {
      name: user.name,
      age: user.age,
      profession: user.profession,
      bio: user.bio,
      location: user.location,
      budget: user.budget,
      hobbies: user.hobbies,
      housingStatus: user.housingStatus,
      preferences: user.preferences
    }

    const currentImage = isEditing ? profileImagePreview : user.profilePicture

    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-[#B7C8B5] rounded-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] overflow-hidden">
          {/* Profile Image Section with Circle Design */}
          <div className="relative p-6 bg-gradient-to-br from-[#44C76F] to-[#B7C8B5]">
            <div className="flex flex-col items-center">
              {/* Circle Profile Picture */}
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] overflow-hidden bg-white">
                  <Image
                    src={currentImage || "/placeholder.svg"}
                    alt={displayData.name}
                    className="w-full h-full object-cover"
                    width={128}
                    height={128}
                  />
                </div>
                {isEditing && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#004D40] border-2 border-white text-white p-0 shadow-lg hover:bg-[#004D40]/80"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Name and Age */}
              <div className="text-center text-[#004D40] mb-2">
                <h2 className="text-2xl font-black">
                  {displayData.name}{displayData.age && `, ${displayData.age}`}
                </h2>
                {displayData.profession && (
                  <p className="text-lg font-bold flex items-center justify-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {displayData.profession}
                  </p>
                )}
              </div>

              {/* Location */}
              {displayData.location && (
                <p className="text-[#004D40] font-bold flex items-center gap-1 mb-2">
                  <MapPin className="h-4 w-4" />
                  {displayData.location}
                </p>
              )}

              {/* Housing Status Badge */}
              {displayData.housingStatus && housingStatusConfig[displayData.housingStatus] && (
                <Badge className={`${housingStatusConfig[displayData.housingStatus].color} text-white font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] mb-3`}>
                  {housingStatusConfig[displayData.housingStatus].icon} {housingStatusConfig[displayData.housingStatus].label}
                </Badge>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-4 space-y-4">

            {/* Budget */}
            {displayData.budget && (
              <div className="flex items-center gap-2">
                <Badge className="bg-[#44C76F] text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40]">
                  💰 ${displayData.budget}/month
                </Badge>
              </div>
            )}

            {/* Preferences as Colored Pills */}
            <div className="space-y-2">
              <h4 className="font-black text-[#004D40] text-sm">PREFERENCES</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(displayData.preferences || {}).map(([key, value]) => {
                  if (!value) return null
                  return (
                    <Badge
                      key={key}
                      className="bg-[#44C76F] text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                    >
                      {preferenceIcons[key as keyof typeof preferenceIcons]} {key.toUpperCase()}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Hobbies */}
            {displayData.hobbies && displayData.hobbies.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-[#004D40] text-sm">HOBBIES</h4>
                <div className="flex flex-wrap gap-2">
                  {displayData.hobbies.map((hobby, index) => (
                    <Badge
                      key={index}
                      className="bg-[#B7C8B5] text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40]"
                    >
                      {hobby}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {displayData.bio && (
              <div className="space-y-2">
                <h4 className="font-black text-[#004D40] text-sm">BIO</h4>
                <p className="text-[#004D40] font-bold leading-relaxed border-l-4 border-[#44C76F] pl-3 text-sm bg-[#F2F5F1] p-2 rounded">
                  {displayData.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1] max-h-[95vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-[#004D40]">
              {isEditing ? "EDIT YOUR PROFILE" : "YOUR PROFILE"}
            </h2>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  EDIT
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? "SAVING..." : "SAVE"}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    CANCEL
                  </Button>
                </>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Profile Preview */}
            <div>
              <h3 className="text-lg font-black text-[#004D40] mb-4">
                {isEditing ? "PREVIEW YOUR CHANGES" : "HOW OTHERS SEE YOU"}
              </h3>
              <div className="bg-[#F2F5F1] p-4 rounded-lg border-2 border-[#004D40]">
                {renderProfilePreview()}
              </div>
            </div>

            {/* Right Side - Edit Form (only show when editing) */}
            {isEditing && (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-[#004D40] mb-4">EDIT DETAILS</h3>
                
                {/* Basic Info */}
                <div className="space-y-4 p-4 border-2 border-[#004D40] rounded-lg bg-white">
                  <h4 className="font-black text-[#004D40]">BASIC INFORMATION</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">NAME *</label>
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        className="border-2 border-[#004D40] font-bold"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">AGE</label>
                      <Input
                        type="number"
                        value={editData.age}
                        onChange={(e) => setEditData(prev => ({ ...prev, age: e.target.value }))}
                        className="border-2 border-[#004D40] font-bold"
                        placeholder="Your age"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">PROFESSION</label>
                      <Input
                        value={editData.profession}
                        onChange={(e) => setEditData(prev => ({ ...prev, profession: e.target.value }))}
                        className="border-2 border-[#004D40] font-bold"
                        placeholder="Your job/profession"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">LOCATION</label>
                      <Input
                        value={editData.location}
                        onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                        className="border-2 border-[#004D40] font-bold"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                  
                  {/* Housing Status */}
                  <div>
                    <label className="block text-sm font-black text-[#004D40] mb-2">HOUSING STATUS</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(housingStatusConfig).map(([key, config]) => (
                        <Button
                          key={key}
                          onClick={() => setEditData(prev => ({ ...prev, housingStatus: key as any }))}
                          className={`${editData.housingStatus === key ? config.color : 'bg-transparent'} ${
                            editData.housingStatus === key ? 'text-white' : 'text-[#004D40]'
                          } font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all`}
                        >
                          {config.icon} {config.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-black text-[#004D40] mb-2">BUDGET ($/month)</label>
                    <Input
                      type="number"
                      value={editData.budget}
                      onChange={(e) => setEditData(prev => ({ ...prev, budget: e.target.value }))}
                      className="border-2 border-[#004D40] font-bold"
                      placeholder="Monthly budget"
                    />
                  </div>
                </div>


                {/* Preferences */}
                <div className="space-y-4 p-4 border-2 border-[#004D40] rounded-lg bg-white">
                  <h4 className="font-black text-[#004D40]">LIFESTYLE PREFERENCES</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(editData.preferences).map(([key, value]) => (
                      <Button
                        key={key}
                        onClick={() => togglePreference(key as keyof UserPreferences)}
                        className={`text-xs p-2 h-auto ${
                          value 
                            ? "bg-[#44C76F] text-[#004D40] border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40]" 
                            : "bg-transparent text-[#004D40] border-2 border-[#004D40]"
                        } hover:translate-x-0.5 hover:translate-y-0.5 transition-all`}
                      >
                        {value && <Check className="h-3 w-3 mr-1" />}
                        {preferenceIcons[key as keyof typeof preferenceIcons]} {key.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Hobbies */}
                <div className="space-y-4 p-4 border-2 border-[#004D40] rounded-lg bg-white">
                  <h4 className="font-black text-[#004D40]">HOBBIES & INTERESTS</h4>
                  
                  {/* Current Hobbies */}
                  <div className="flex flex-wrap gap-2">
                    {editData.hobbies.map((hobby, index) => (
                      <Badge
                        key={index}
                        className="bg-[#B7C8B5] text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] cursor-pointer hover:bg-red-100"
                        onClick={() => removeHobby(hobby)}
                      >
                        {hobby} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Add Custom Hobby */}
                  <div>
                    <Input
                      placeholder="Add a hobby (press Enter)"
                      className="border-2 border-[#004D40] font-bold"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          addHobby(e.currentTarget.value.trim())
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                  
                  {/* Quick Add Emojis */}
                  <div className="flex flex-wrap gap-2">
                    {hobbyEmojis.map((emoji, index) => (
                      <Button
                        key={index}
                        onClick={() => addHobby(emoji)}
                        className="text-lg p-2 bg-transparent hover:bg-[#44C76F]/20 border-2 border-[#004D40] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                        disabled={editData.hobbies.includes(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-4 p-4 border-2 border-[#004D40] rounded-lg bg-white">
                  <h4 className="font-black text-[#004D40]">BIO</h4>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full p-3 border-2 border-[#004D40] rounded font-bold text-[#004D40] resize-none"
                    rows={4}
                    placeholder="Tell others about yourself, your interests, what you're looking for in a roommate..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-gray-600 mt-6">
            <p className="font-bold">
              This is exactly how your profile appears to other users in the discover section.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}