"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoommateOnboarding from "@/components/onboarding/RoommateOnboarding";
import { setupUserProfile, setUserRole } from "@/services/roommate-matching";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole, ProfileFormData, RoomDetailsFormData, SeekerPreferencesFormData } from "@/types/user";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleOnboardingComplete = async (data: {
    role: UserRole
    profile: ProfileFormData
    roomDetails?: RoomDetailsFormData
    preferences?: SeekerPreferencesFormData
  }) => {
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    setIsLoading(true);
    
    try {
      // Set user role first
      const roleResult = await setUserRole(user.uid, data.role);
      if (!roleResult.success) {
        throw new Error(roleResult.error || 'Failed to set user role');
      }

      // Setup the complete profile
      const profileResult = await setupUserProfile(
        user.uid,
        data.profile,
        data.roomDetails,
        data.preferences
      );

      if (!profileResult.success) {
        throw new Error(profileResult.error || 'Failed to setup profile');
      }

      console.log('✅ Onboarding completed successfully');
      
      // Redirect based on user role
      setTimeout(() => {
        if (data.role === 'provider') {
          router.push('/marketplace'); // or dashboard
        } else {
          router.push('/marketplace');
        }
      }, 2000); // Give time for completion animation
      
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      throw error; // Re-throw so RoommateOnboarding can handle it
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RoommateOnboarding
      onComplete={handleOnboardingComplete}
      loading={isLoading}
    />
  );
}