"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"
import RoleSelection from "./RoleSelection"
import ProfileSetupForm from "./ProfileSetupForm"
import { useToast } from "@/hooks/use-toast"
import type { UserRole, ProfileFormData, RoomDetailsFormData, SeekerPreferencesFormData } from "@/types/roommate"

type OnboardingStep = 'role-selection' | 'profile-setup' | 'completed'

interface RoommateOnboardingProps {
  onComplete?: () => void
}

export default function RoommateOnboarding({ onComplete }: RoommateOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('role-selection')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Handle role selection
  const handleRoleSelect = useCallback(async (role: UserRole) => {
    try {
      setLoading(true)
      setSelectedRole(role)

      // Set user role via API
      const response = await fetch('/api/roommate/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to set user role')
      }

      // Move to profile setup
      setCurrentStep('profile-setup')
      toast({
        title: "Role Selected",
        description: `You're now a ${role}! Let's set up your profile.`,
      })
    } catch (error) {
      console.error('Error setting role:', error)
      toast({
        title: "Error",
        description: "Failed to set your role. Please try again.",
        variant: "destructive",
      })
      setSelectedRole(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Handle profile completion
  const handleProfileComplete = useCallback(async (
    profileData: ProfileFormData,
    roomData?: RoomDetailsFormData,
    preferences?: SeekerPreferencesFormData,
    roomImages?: File[]
  ) => {
    try {
      setLoading(true)

      // Prepare form data for multipart upload
      const formData = new FormData()
      formData.append('profileData', JSON.stringify(profileData))
      
      if (roomData) {
        formData.append('roomData', JSON.stringify(roomData))
      }
      
      if (preferences) {
        formData.append('preferencesData', JSON.stringify(preferences))
      }

      // Add room images
      if (roomImages && roomImages.length > 0) {
        roomImages.forEach((image, index) => {
          formData.append(`roomImage_${index}`, image)
        })
      }

      // Submit profile
      const response = await fetch('/api/roommate/profile', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!data.success) {
        if (data.validation_errors) {
          // Handle validation errors
          const errorMessages = Object.values(data.validation_errors).join(', ')
          throw new Error(`Validation errors: ${errorMessages}`)
        }
        throw new Error(data.error || 'Failed to setup profile')
      }

      // Success!
      setCurrentStep('completed')
      toast({
        title: "Profile Complete! 🎉",
        description: data.message || "Your profile has been set up successfully!",
        duration: 5000,
      })

      // Auto-complete after showing success
      setTimeout(() => {
        onComplete?.()
      }, 3000)
    } catch (error) {
      console.error('Error completing profile:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete profile setup.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, onComplete])

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {/* Role Selection Step */}
        {currentStep === 'role-selection' && (
          <motion.div
            key="role-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RoleSelection
              onRoleSelect={handleRoleSelect}
              loading={loading}
            />
          </motion.div>
        )}

        {/* Profile Setup Step */}
        {currentStep === 'profile-setup' && selectedRole && (
          <motion.div
            key="profile-setup"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <ProfileSetupForm
              userRole={selectedRole}
              onComplete={handleProfileComplete}
              loading={loading}
            />
          </motion.div>
        )}

        {/* Completion Step */}
        {currentStep === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4"
          >
            <div className="max-w-lg w-full text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-gray-900 mb-4"
              >
                Welcome to Roomeo! 🎉
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-gray-600 mb-6"
              >
                Your profile is now complete and you're ready to{' '}
                {selectedRole === 'provider' 
                  ? 'find the perfect roommate for your space!' 
                  : 'discover amazing rooms and roommates!'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
              >
                <h3 className="font-semibold text-gray-900 mb-3">What's next?</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {selectedRole === 'provider' ? (
                    <>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        Your room photos are live and visible to seekers
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        Browse seekers who match your preferences
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                        Like profiles to get matched and start chatting
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        Browse available rooms from providers
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        Like rooms and roommates you're interested in
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                        Get matched and start your roommate journey
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="mt-6 text-sm text-gray-500"
              >
                Redirecting you to the app in a few seconds...
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}