"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit3, Save, X, Camera, Upload, Check } from "lucide-react"
import { updateUserProfile } from "@/services/supabase"
import type { User, UserPreferences } from "@/types/user"

interface ProfileViewEditProps {
  user: User
  onClose: () => void
  onUpdate?: () => void
}

export default function ProfileViewEdit({ user, onClose, onUpdate }: ProfileViewEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editData, setEditData] = useState({
    name: user?.name || "",
    age: user?.age || "",
    bio: user?.bio || "",
    location: user?.location || "",
    budget: user?.budget || "",
    preferences: user?.preferences || {
      smoking: false,
      drinking: false,
      vegetarian: false,
      pets: false
    }
  })

  useEffect(() => {
    // Reset edit data when user changes
    setEditData({
      name: user?.name || "",
      age: user?.age || "",
      bio: user?.bio || "",
      location: user?.location || "",
      budget: user?.budget || "",
      preferences: user?.preferences || {
        smoking: false,
        drinking: false,
        vegetarian: false,
        pets: false
      }
    })
  }, [user])

  const handleSave = async () => {
    if (!user?.id) return

    setIsUpdating(true)
    try {
      const ageValue = editData.age ? parseInt(editData.age.toString()) : null
      const budgetValue = editData.budget ? parseInt(editData.budget.toString()) : null

      const updatePayload = {
        name: editData.name.trim(),
        age: ageValue,
        bio: editData.bio?.trim() || "",
        location: editData.location?.trim() || "",
        budget: budgetValue,
        preferences: editData.preferences
      }

      const success = await updateUserProfile(user.id, updatePayload)

      if (success) {
        alert("Profile updated successfully!")
        setIsEditing(false)
        onUpdate?.()
      } else {
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

  // Render the profile card in the same style as SwipePage
  const renderProfileCard = () => {
    const displayData = isEditing ? editData : {
      name: user.name,
      age: user.age,
      bio: user.bio,
      location: user.location,
      budget: user.budget,
      preferences: user.preferences
    }

    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-[#B7C8B5] rounded-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] overflow-hidden">
          {/* Profile Image Section */}
          <div className="relative">
            <Image
              alt={displayData.name}
              className="w-full h-80 object-cover"
              src={user.profilePicture || "/placeholder.svg"}
              width={400}
              height={320}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-2xl font-black bg-white/20 border-white/30 text-white placeholder-white/70"
                    placeholder="Name"
                  />
                  <Input
                    type="number"
                    value={editData.age}
                    onChange={(e) => setEditData(prev => ({ ...prev, age: e.target.value }))}
                    className="bg-white/20 border-white/30 text-white placeholder-white/70"
                    placeholder="Age"
                  />
                </div>
              ) : (
                <h2 className="text-2xl font-black transform -skew-x-1">
                  {displayData.name}, {displayData.age}
                </h2>
              )}
              <p className="text-base font-bold">
                {user.userType === "provider" ? "HAS A PLACE" : "LOOKING FOR A PLACE"}
              </p>
              {isEditing ? (
                <Input
                  value={editData.location}
                  onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                  className="bg-white/20 border-white/30 text-white placeholder-white/70 mt-2"
                  placeholder="📍 Location"
                />
              ) : (
                displayData.location && (
                  <p className="text-sm font-bold opacity-90">📍 {displayData.location}</p>
                )
              )}
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="p-4 space-y-3">
            {/* Preferences */}
            <div className="flex items-center text-[#004D40] space-x-3 flex-wrap gap-2">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 w-full">
                  {Object.entries(editData.preferences).map(([key, value]) => (
                    <Button
                      key={key}
                      onClick={() => togglePreference(key as keyof UserPreferences)}
                      className={`text-xs p-2 h-auto ${
                        value 
                          ? "bg-[#44C76F] text-[#004D40] border-2 border-[#004D40]" 
                          : "bg-transparent text-[#004D40] border-2 border-[#004D40]"
                      }`}
                    >
                      {value && <Check className="h-3 w-3 mr-1" />}
                      {key.toUpperCase()}
                    </Button>
                  ))}
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-1 font-black text-sm">
                    <svg
                      className={`w-4 h-4 ${displayData.preferences?.smoking ? 'text-red-500' : 'text-[#44C76F]'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                      />
                    </svg>
                    {displayData.preferences?.smoking ? "SMOKER" : "NON-SMOKER"}
                  </span>
                  <span className="flex items-center gap-1 font-black text-sm">
                    <svg
                      className="w-4 h-4 text-[#44C76F]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {displayData.preferences?.pets ? "PET-FRIENDLY" : "NO PETS"}
                  </span>
                  {displayData.preferences?.vegetarian && (
                    <span className="flex items-center gap-1 font-black text-sm">
                      <span className="text-[#44C76F]">🌱</span>
                      VEGETARIAN
                    </span>
                  )}
                  {displayData.preferences?.drinking && (
                    <span className="flex items-center gap-1 font-black text-sm">
                      <span className="text-[#44C76F]">🍺</span>
                      DRINKS
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Bio */}
            {isEditing ? (
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-1">BIO</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full p-2 border-2 border-[#004D40] rounded font-bold text-[#004D40] resize-none"
                  rows={3}
                  placeholder="Tell others about yourself..."
                />
              </div>
            ) : (
              displayData.bio && (
                <p className="text-[#004D40] font-bold leading-relaxed border-l-4 border-[#44C76F] pl-3 text-sm">
                  {displayData.bio}
                </p>
              )
            )}

            {/* Budget */}
            {user.userType === "seeker" && (
              <div>
                {isEditing ? (
                  <div>
                    <label className="block text-sm font-black text-[#004D40] mb-1">BUDGET ($)</label>
                    <Input
                      type="number"
                      value={editData.budget}
                      onChange={(e) => setEditData(prev => ({ ...prev, budget: e.target.value }))}
                      className="border-2 border-[#004D40] font-bold"
                      placeholder="Monthly budget"
                    />
                  </div>
                ) : (
                  displayData.budget && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#44C76F] text-[#004D40] font-black border-2 border-[#004D40]">
                        💰 ${displayData.budget}/month
                      </Badge>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1] max-h-[95vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-[#004D40]">
              {isEditing ? "EDIT PROFILE" : "YOUR PROFILE"}
            </h2>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40]"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  EDIT
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? "SAVING..." : "SAVE"}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black"
                  >
                    CANCEL
                  </Button>
                </>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Profile Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-black text-[#004D40] mb-4">
              {isEditing ? "PREVIEW YOUR CHANGES" : "HOW OTHERS SEE YOU"}
            </h3>
            <div className="bg-[#F2F5F1] p-4 rounded-lg border-2 border-[#004D40]">
              {renderProfileCard()}
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-600">
            <p className="font-bold">
              This is exactly how your profile appears to other users in the discover section.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}