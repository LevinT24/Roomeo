"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [age, setAge] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [budget, setBudget] = useState("")
  const [preferences, setPreferences] = useState({
    smoking: false,
    drinking: false,
    vegetarian: false,
    pets: false,
  })
  const [loading, setLoading] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePreferenceToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)

    // Mock profile update - just update localStorage
    const updatedUser = {
      ...user,
      profilePicture: imagePreview || user.profilePicture,
      age: Number.parseInt(age),
      bio: bio.trim(),
      location: location.trim(),
      budget: budget ? Number.parseInt(budget) : null,
      preferences,
      updatedAt: new Date(),
    }

    localStorage.setItem("mockUser", JSON.stringify(updatedUser))

    setTimeout(() => {
      setLoading(false)
      onComplete()
    }, 1000)
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#B7C8B5]">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-[#004D40] mb-2 transform -skew-x-2">ADD YOUR PHOTO</h2>
              <div className="w-24 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
              <p className="text-[#004D40] font-bold">Upload a profile picture to get started</p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col items-center">
                {imagePreview ? (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#44C76F] shadow-[4px_4px_0px_0px_#004D40]"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-[#F2F5F1] border-4 border-[#004D40] flex items-center justify-center shadow-[4px_4px_0px_0px_#004D40]">
                    <svg
                      className="w-12 h-12 text-[#004D40]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-image"
                />
                <label
                  htmlFor="profile-image"
                  className="mt-4 cursor-pointer bg-[#44C76F] text-[#004D40] font-black px-6 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                >
                  CHOOSE PHOTO
                </label>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!profileImage}
                className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                CONTINUE
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#B7C8B5]">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#004D40] mb-2 transform -skew-x-2">TELL US ABOUT YOURSELF</h2>
            <div className="w-24 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            <p className="text-[#004D40] font-bold">Answer a few quick questions</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-[#004D40] mb-2">AGE</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-[#004D40] mb-2">BIO</label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1]"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-[#004D40] mb-2">LOCATION</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1]"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-[#004D40] mb-2">BUDGET (OPTIONAL)</label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Monthly budget in $"
                className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1]"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-[#004D40]">PREFERENCES</h3>
              {[
                { key: "smoking", label: "Do you smoke?" },
                { key: "drinking", label: "Do you drink?" },
                { key: "vegetarian", label: "Are you vegetarian?" },
                { key: "pets", label: "Do you have pets?" },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 border-4 border-[#004D40] rounded-lg bg-[#F2F5F1]"
                >
                  <span className="font-black text-[#004D40]">{label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreferenceToggle(key as keyof typeof preferences)}
                      className={`px-4 py-2 rounded-lg font-black border-2 border-[#004D40] transition-all ${
                        preferences[key as keyof typeof preferences]
                          ? "bg-[#44C76F] text-[#004D40] shadow-[2px_2px_0px_0px_#004D40]"
                          : "bg-[#F2F5F1] text-[#004D40] hover:bg-[#B7C8B5]"
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreferenceToggle(key as keyof typeof preferences)}
                      className={`px-4 py-2 rounded-lg font-black border-2 border-[#004D40] transition-all ${
                        !preferences[key as keyof typeof preferences]
                          ? "bg-[#44C76F] text-[#004D40] shadow-[2px_2px_0px_0px_#004D40]"
                          : "bg-[#F2F5F1] text-[#004D40] hover:bg-[#B7C8B5]"
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!age || loading}
              className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
            >
              {loading ? "SETTING UP..." : "COMPLETE SETUP"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
