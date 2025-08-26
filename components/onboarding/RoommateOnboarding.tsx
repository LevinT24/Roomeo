"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"
import RoleSelection from "./RoleSelection"
import ProfileSetupForm from "./ProfileSetupForm"
import { useToast } from "@/hooks/use-toast"
import type { UserRole, ProfileFormData, RoomDetailsFormData, SeekerPreferencesFormData } from "@/types/user"

type OnboardingStep = 'role-selection' | 'profile-setup' | 'completed'

interface RoommateOnboardingProps {
  onComplete: (data: {
    role: UserRole
    profile: ProfileFormData
    roomDetails?: RoomDetailsFormData
    preferences?: SeekerPreferencesFormData
  }) => void
  loading?: boolean
}

export default function RoommateOnboarding({ onComplete, loading = false }: RoommateOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('role-selection')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleRoleSelect = useCallback((role: UserRole) => {
    setSelectedRole(role)
    setCurrentStep('profile-setup')
    
    toast({
      title: "Role selected!",
      description: `You've chosen to be a ${role === 'provider' ? 'Room Provider' : 'Room Seeker'}`,
    })
  }, [toast])

  const handleProfileComplete = useCallback(async (
    profileData: ProfileFormData, 
    roomData?: RoomDetailsFormData, 
    preferences?: SeekerPreferencesFormData, 
    roomImages?: File[]
  ) => {
    if (!selectedRole) return

    setIsSubmitting(true)
    
    try {
      await onComplete({
        role: selectedRole,
        profile: profileData,
        roomDetails: roomData,
        preferences: preferences
      })
      
      setCurrentStep('completed')
      
      toast({
        title: "Welcome to Roomio! 🎉",
        description: "Your profile has been created successfully!",
      })
      
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: "Something went wrong",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedRole, onComplete, toast])

  const renderStep = () => {
    switch (currentStep) {
      case 'role-selection':
        return (
          <RoleSelection
            onRoleSelect={handleRoleSelect}
            loading={loading}
          />
        )
      
      case 'profile-setup':
        return (
          <ProfileSetupForm
            userRole={selectedRole!}
            onComplete={handleProfileComplete}
            loading={isSubmitting || loading}
          />
        )
      
      case 'completed':
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                Welcome to Roomio!
              </h1>
              
              <p className="text-lg text-gray-600 mb-8">
                Your profile is ready. Start connecting with potential roommates!
              </p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-gray-500"
              >
                Redirecting to your dashboard...
              </motion.div>
            </motion.div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderStep()}
      </motion.div>
    </AnimatePresence>
  )
}