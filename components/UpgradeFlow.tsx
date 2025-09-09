"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Users, Home, Zap } from "lucide-react"
import UpgradeUserTypeSelection from "@/components/UpgradeUserTypeSelection"
import UpgradeProfileSetup from "@/components/UpgradeProfileSetup"
import RoomPhotoUpload from "@/components/roomPhotos/RoomPhotoUpload"
import { useAuth } from "@/hooks/useAuth"
import { updateUserProfile } from "@/services/supabase"

interface UpgradeFlowProps {
  onComplete: () => void
  onCancel: () => void
}

export default function UpgradeFlow({ onComplete, onCancel }: UpgradeFlowProps) {
  const { user, refreshUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedUserType, setSelectedUserType] = useState<"provider" | "seeker" | null>(null)
  const [budget, setBudget] = useState("")
  const [roomPhotosCompleted, setRoomPhotosCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUserTypeSelection = (userType: "provider" | "seeker") => {
    setSelectedUserType(userType)
    
    // If seeker, skip room photos and go to budget
    // If provider, go to room photos first
    if (userType === "seeker") {
      setCurrentStep(4) // Skip room photos, go to budget
    } else {
      setCurrentStep(3) // Go to room photos
    }
  }

  const handleRoomPhotosComplete = () => {
    setRoomPhotosCompleted(true)
    setCurrentStep(4) // Go to budget collection
  }

  const handleBudgetComplete = (budgetValue: string) => {
    setBudget(budgetValue)
    setCurrentStep(5) // Go to completion
  }

  const handleFinalUpgrade = async () => {
    if (!user || !selectedUserType) {
      setError("Missing required information for upgrade")
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log("🚀 Starting upgrade process:", {
        userId: user.id,
        currentUserType: user.userType,
        newUserType: selectedUserType,
        budget: budget,
        roomPhotosCompleted
      })

      // Prepare upgrade data - preserve all existing data
      const upgradeData = {
        usertype: selectedUserType,
        budget: budget ? Number(budget) : user.budget || 0,
        upgraded_at: new Date().toISOString(),
        original_signup_type: user.userType, // Track they were originally quick_access
        // Clear profile completion status since they're now fully set up
        profile_completion_status: {},
      }

      console.log("🔄 Updating user profile with upgrade data:", upgradeData)

      // Update user profile in database
      const success = await updateUserProfile(user.id, upgradeData)
      if (!success) {
        throw new Error("Failed to update user profile during upgrade")
      }

      console.log("✅ Profile upgrade successful")
      
      // Refresh user data to get updated information
      console.log("🔄 Refreshing user data...")
      const refreshSuccess = await refreshUser()
      if (!refreshSuccess) {
        console.warn("⚠️ User data refresh failed, but upgrade was saved")
      }

      console.log("✅ Upgrade process completed successfully")
      onComplete()

    } catch (error) {
      console.error("❌ Upgrade failed:", error)
      setError(error instanceof Error ? error.message : "Upgrade failed")
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Welcome/Intro Screen
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] bg-[#B7C8B5]">
          <CardContent className="p-8 text-center">
            <Button
              onClick={onCancel}
              className="absolute top-4 left-4 bg-[#F2F5F1] hover:bg-gray-200 text-[#004D40] border-2 border-[#004D40] p-2 font-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="w-20 h-20 bg-[#44C76F] border-4 border-[#004D40] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[6px_6px_0px_0px_#004D40] animate-bounce">
              <Sparkles className="h-10 w-10 text-[#004D40]" />
            </div>

            <h1 className="text-3xl font-black text-[#004D40] mb-4 transform -skew-x-2">
              UPGRADE TIME! 🚀
            </h1>

            <div className="w-32 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-6"></div>

            <p className="text-lg font-bold text-[#004D40] mb-6 leading-tight">
              Ready to unlock the full Roomio experience? You&apos;ll get access to roommate matching while keeping all your existing data!
            </p>

            <div className="bg-[#F2F5F1] border-2 border-[#004D40] p-4 mb-6 text-left">
              <h3 className="font-black text-[#004D40] mb-3 text-center">🎉 WHAT YOU&apos;LL UNLOCK:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-[#44C76F] flex-shrink-0" />
                  <span className="text-sm font-bold text-[#004D40]">Swipe through potential roommates</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-[#44C76F] flex-shrink-0" />
                  <span className="text-sm font-bold text-[#004D40]">Match with compatible people</span>
                </div>
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-[#44C76F] flex-shrink-0" />
                  <span className="text-sm font-bold text-[#004D40]">Access the full matches page</span>
                </div>
              </div>
            </div>

            <div className="bg-[#44C76F]/20 border-2 border-[#44C76F] p-3 mb-6 rounded">
              <p className="text-sm font-black text-[#004D40]">
                💾 DON&apos;T WORRY - All your marketplace listings, expenses, and chat history will be preserved!
              </p>
            </div>

            <Button
              onClick={() => setCurrentStep(2)}
              className="w-full bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black text-xl py-4 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
            >
              🚀 LET&apos;S UPGRADE!
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 2: User Type Selection
  if (currentStep === 2) {
    return (
      <UpgradeUserTypeSelection 
        onSelect={handleUserTypeSelection}
        onCancel={onCancel}
      />
    )
  }

  // Step 3: Room Photos (Provider only)
  if (currentStep === 3 && selectedUserType === "provider") {
    return (
      <div className="min-h-screen bg-[#F2F5F1]">
        <div className="px-4 py-6 border-b-4 border-[#004D40]">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCurrentStep(2)}
              className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] border-2 border-[#004D40] p-2 font-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-[#004D40]">ROOM PHOTOS</h1>
              <p className="text-sm font-bold text-[#44C76F]">Step 3 of 4 - Show off your space!</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <RoomPhotoUpload
            onPhotosUploaded={(photos) => {
              console.log("Room photos uploaded:", photos)
              // Photos are automatically saved, we just need to continue
            }}
            maxPhotos={5}
          />
          
          {/* Continue/Skip buttons */}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => setCurrentStep(4)} // Skip to budget
              variant="outline"
              className="flex-1 border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black py-3"
            >
              SKIP PHOTOS
            </Button>
            
            <Button
              onClick={handleRoomPhotosComplete}
              className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black py-3 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
            >
              CONTINUE TO BUDGET
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Budget Collection
  if (currentStep === 4) {
    return (
      <UpgradeProfileSetup
        userType={selectedUserType!}
        onComplete={handleBudgetComplete}
        onBack={() => {
          if (selectedUserType === "provider") {
            setCurrentStep(3) // Back to room photos
          } else {
            setCurrentStep(2) // Back to user type selection
          }
        }}
      />
    )
  }

  // Step 5: Completion
  if (currentStep === 5) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] bg-[#B7C8B5]">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-[#44C76F] border-4 border-[#004D40] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[6px_6px_0px_0px_#004D40] animate-pulse">
              <Sparkles className="h-10 w-10 text-[#004D40]" />
            </div>

            <h1 className="text-3xl font-black text-[#004D40] mb-4 transform -skew-x-2">
              READY TO ACTIVATE! ✨
            </h1>

            <p className="text-lg font-bold text-[#004D40] mb-6">
              You&apos;ve selected <span className="text-[#44C76F]">{selectedUserType === "provider" ? "PROVIDER" : "SEEKER"}</span> mode
              {budget && <span> with a ${budget} budget</span>}.
            </p>

            <div className="bg-[#F2F5F1] border-2 border-[#004D40] p-4 mb-6">
              <p className="font-black text-[#004D40] text-sm mb-2">🎯 UPGRADE SUMMARY:</p>
              <ul className="text-sm font-bold text-[#004D40] space-y-1">
                <li>✓ User type: {selectedUserType === "provider" ? "Looking for roommates" : "Looking for a place"}</li>
                {budget && <li>✓ Budget: ${budget}/month</li>}
                {selectedUserType === "provider" && <li>✓ Room photos: {roomPhotosCompleted ? "Added" : "Skipped"}</li>}
                <li>✓ All existing data preserved</li>
              </ul>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-center rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentStep(4)}
                variant="outline"
                className="flex-1 border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black"
              >
                BACK
              </Button>
              
              <Button
                onClick={handleFinalUpgrade}
                disabled={loading}
                className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black text-lg py-3 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
              >
                {loading ? "UPGRADING..." : "🚀 ACTIVATE UPGRADE!"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}