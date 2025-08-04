  // components/ProfileSetup.tsx
  "use client"

  import type React from "react"
  import { useState } from "react"
  import { useAuth } from "@/hooks/useAuth"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Card, CardContent } from "@/components/ui/card"
  import { updateUserProfile } from "@/services/supabase";
  import { uploadImage } from "@/lib/storage";
  import { ProfileData } from "@/types/user";

  export default function ProfileSetup({ onComplete }: { onComplete: () => void }) {
    const { user } = useAuth()
    const [step, setStep] = useState(1)
    const [userType, setUserType] = useState<"seeker" | "provider" | null>(null)
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
    const [error, setError] = useState<string | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)

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
      if (!user || !userType) return;
      setLoading(true);
      setError(null);
      setUploadError(null);

      try {
        let photoUrl = imagePreview || "";
        
        // Only upload if new image was selected
        if (profileImage) {
          console.log("🔄 Starting image upload...");
          const uploadResult = await uploadImage(profileImage, user.id);
          
          if (uploadResult.success && uploadResult.url) {
            photoUrl = uploadResult.url;
            console.log("✅ Image upload successful:", photoUrl);
          } else {
            console.error("❌ Upload failed:", uploadResult.error);
            setUploadError(uploadResult.error || "Upload failed");
            
            // Continue without the image rather than failing completely
            console.log("⚠️ Continuing profile setup without uploaded image");
          }
        }

        const profileData = {
          age: Number(age),
          bio,
          location,
          budget: budget ? Number(budget) : 0,
          preferences,
          profilepicture: photoUrl, // Fixed: use lowercase to match database
          updatedat: new Date().toISOString(), // Fixed: use lowercase and ISO string
          usertype: userType, // Fixed: use lowercase to match database
          name: user.name || "",
          email: user.email || "",
        };

        // Save to Supabase
        console.log("🔄 Saving profile data...");
        const success = await updateUserProfile(user.id, profileData);
        if (!success) {
          throw new Error("Failed to update profile");
        }
        
        console.log("✅ Profile setup completed successfully");
        onComplete();
      } catch (error) {
        console.error("❌ Profile setup failed:", error);
        setError(error instanceof Error ? error.message : "Profile setup failed");
      } finally {
        setLoading(false);
      }
    };

    // Step 1: User Type Selection
    if (step === 1) {
      return (
        <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-[#004D40] mb-2 transform -skew-x-2">WHAT ARE YOU LOOKING FOR?</h2>
                <div className="w-24 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
                <p className="text-[#004D40] font-bold">Choose your roommate journey</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setUserType("seeker")}
                  className={`w-full p-6 rounded-lg border-4 transition-all ${
                    userType === "seeker"
                      ? "bg-[#44C76F] border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] text-[#004D40]"
                      : "bg-[#F2F5F1] border-[#004D40] hover:bg-[#B7C8B5] text-[#004D40]"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">🏠</div>
                    <h3 className="font-black text-lg mb-2">LOOKING FOR OWNERS</h3>
                    <p className="font-bold text-sm">I need a place to live</p>
                  </div>
                </button>

                <button
                  onClick={() => setUserType("provider")}
                  className={`w-full p-6 rounded-lg border-4 transition-all ${
                    userType === "provider"
                      ? "bg-[#44C76F] border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] text-[#004D40]"
                      : "bg-[#F2F5F1] border-[#004D40] hover:bg-[#B7C8B5] text-[#004D40]"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">👥</div>
                    <h3 className="font-black text-lg mb-2">LOOKING FOR ROOMMATES</h3>
                    <p className="font-bold text-sm">I have a place and need roommates</p>
                  </div>
                </button>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!userType}
                className="w-full mt-6 bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                CONTINUE
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Step 2: Photo Upload
    if (step === 2) {
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

                {/* Optional: Skip photo upload */}
                <div className="text-center">
                  <button
                    onClick={() => setStep(3)}
                    className="text-[#004D40] font-bold underline hover:text-[#44C76F] transition-colors"
                  >
                    SKIP FOR NOW
                  </button>
                </div>

                <Button
                  onClick={() => setStep(3)}
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

    // Step 3: Profile Details
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

              {/* Error Messages */}
              {error && (
                <div className="p-4 border-4 border-red-500 bg-red-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-600 font-black">⚠️</span>
                    <span className="font-black text-red-700">PROFILE SETUP ERROR</span>
                  </div>
                  <p className="text-red-700 font-bold text-sm">{error}</p>
                </div>
              )}
              
              {uploadError && (
                <div className="p-4 border-4 border-orange-500 bg-orange-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-600 font-black">⚠️</span>
                    <span className="font-black text-orange-700">IMAGE UPLOAD WARNING</span>
                  </div>
                  <p className="text-orange-700 font-bold text-sm">{uploadError}</p>
                  <p className="text-orange-600 text-xs mt-1">Profile will be saved without the uploaded image.</p>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!age || !userType || loading}
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