"[^"]*"

import { useState, useCallback } from "[^"]*"
import { motion, AnimatePresence } from "[^"]*"
import { CheckCircle } from "[^"]*"
import RoleSelection from "[^"]*"
import ProfileSetupForm from "[^"]*"
import { useToast } from "[^"]*"
import type { UserRole, ProfileFormData, RoomDetailsFormData, SeekerPreferencesFormData } from "[^"]*"

type OnboardingStep = &apos;role-selection&apos; | &apos;profile-setup&apos; | &apos;completed&apos;

interface RoommateOnboardingProps {
  onComplete?: () => void
}

export default function RoommateOnboarding({ onComplete }: RoommateOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(&apos;role-selection&apos;)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Handle role selection
  const handleRoleSelect = useCallback(async (role: UserRole) => {
    try {
      setLoading(true)
      setSelectedRole(role)

      // Set user role via API
      const response = await fetch(&apos;/api/roommate/role&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({ role })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || &apos;Failed to set user role&apos;)
      }

      // Move to profile setup
      setCurrentStep(&apos;profile-setup&apos;)
      toast({
        title: "[^"]*",
        description: `You&apos;re now a ${role}! Let&apos;s set up your profile.`,
      })
    } catch (error) {
      console.error(&apos;Error setting role:&apos;, error)
      toast({
        title: "[^"]*",
        description: "[^"]*",
        variant: "[^"]*",
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
      formData.append(&apos;profileData&apos;, JSON.stringify(profileData))
      
      if (roomData) {
        formData.append(&apos;roomData&apos;, JSON.stringify(roomData))
      }
      
      if (preferences) {
        formData.append(&apos;preferencesData&apos;, JSON.stringify(preferences))
      }

      // Add room images
      if (roomImages && roomImages.length > 0) {
        roomImages.forEach((image, index) => {
          formData.append(`roomImage_${index}`, image)
        })
      }

      // Submit profile
      const response = await fetch(&apos;/api/roommate/profile&apos;, {
        method: &apos;POST&apos;,
        body: formData
      })

      const data = await response.json()

      if (!data.success) {
        if (data.validation_errors) {
          // Handle validation errors
          const errorMessages = Object.values(data.validation_errors).join(&apos;, &apos;)
          throw new Error(`Validation errors: ${errorMessages}`)
        }
        throw new Error(data.error || &apos;Failed to setup profile&apos;)
      }

      // Success!
      setCurrentStep(&apos;completed&apos;)
      toast({
        title: "Profile Complete! 🎉",
        description: data.message || "[^"]*",
        duration: 5000,
      })

      // Auto-complete after showing success
      setTimeout(() => {
        onComplete?.()
      }, 3000)
    } catch (error) {
      console.error(&apos;Error completing profile:&apos;, error)
      toast({
        title: "[^"]*",
        description: error instanceof Error ? error.message : "[^"]*",
        variant: "[^"]*",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, onComplete])

  return (
    <div className="[^"]*">
      <AnimatePresence mode="[^"]*">
        {/* Role Selection Step */}
        {currentStep === &apos;role-selection&apos; && (
          <motion.div
            key="[^"]*"
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
        {currentStep === &apos;profile-setup&apos; && selectedRole && (
          <motion.div
            key="[^"]*"
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
        {currentStep === &apos;completed&apos; && (
          <motion.div
            key="[^"]*"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="[^"]*"
          >
            <div className="[^"]*">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "[^"]*", stiffness: 200 }}
                className="[^"]*"
              >
                <CheckCircle className="[^"]*" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="[^"]*"
              >
                Welcome to Roomeo! 🎉
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="[^"]*"
              >
                Your profile is now complete and you&apos;re ready to{&apos; &apos;}
                {selectedRole === &apos;provider&apos; 
                  ? &apos;find the perfect roommate for your space!&apos; 
                  : &apos;discover amazing rooms and roommates!&apos;}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="[^"]*"
              >
                <h3 className="[^"]*">What&apos;s next?</h3>
                <div className="[^"]*">
                  {selectedRole === &apos;provider&apos; ? (
                    <>
                      <div className="[^"]*">
                        <div className="[^"]*"></div>
                        Your room photos are live and visible to seekers
                      </div>
                      <div className="[^"]*">
                        <div className="[^"]*"></div>
                        Browse seekers who match your preferences
                      </div>
                      <div className="[^"]*">
                        <div className="[^"]*"></div>
                        Like profiles to get matched and start chatting
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="[^"]*">
                        <div className="[^"]*"></div>
                        Browse available rooms from providers
                      </div>
                      <div className="[^"]*">
                        <div className="[^"]*"></div>
                        Like rooms and roommates you&apos;re interested in
                      </div>
                      <div className="[^"]*">
                        <div className="[^"]*"></div>
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
                className="[^"]*"
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