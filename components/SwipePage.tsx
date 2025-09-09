"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import LockedSwipePage from "@/components/LockedSwipePage"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
  age?: number
  bio?: string
  location?: string
  preferences?: {
    smoking: boolean
    drinking: boolean
    vegetarian: boolean
    pets: boolean
  }
  userType?: "seeker" | "provider" | "quick_access" | null
}

interface SwipePageProps {
  user?: User // Make it optional since we'll fetch from useAuth
  refreshTrigger?: number // Add a trigger to force refresh when matches are removed
  onNavigateToSettings?: () => void // Add callback to navigate to settings
  onUpgrade?: () => void // Add callback to trigger upgrade flow
}


export default function SwipePage({ user: propUser, refreshTrigger, onNavigateToSettings, onUpgrade }: SwipePageProps = {}) {
  const { user: authUser, logout } = useAuth()
  const [profiles, setProfiles] = useState<User[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  // Use the user from props or auth
  const currentUser = propUser || authUser

  // Check if swipe page should be locked for quick_access users
  const isSwipeLocked = currentUser?.userType === 'quick_access'

  // Handle upgrade flow for locked users
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade() // Trigger upgrade flow directly
    } else if (onNavigateToSettings) {
      onNavigateToSettings() // Navigate to settings where upgrade button will be
    } else {
      // Fallback: could navigate to settings directly or show upgrade modal
      console.log("🔄 User wants to upgrade from Quick Access")
    }
  }

  const fetchOppositeTypeUsers = useCallback(async () => {
    if (!currentUser?.id) {
      setError("User not found")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check if current user's profile is hidden - if so, block them from viewing others
      const { data: currentUserData, error: userCheckError } = await supabase
        .from('users')
        .select('profilevisible')
        .eq('id', currentUser.id)
        .single()

      if (userCheckError) {
        console.error('Error checking user profile visibility:', userCheckError)
        setError('Unable to verify profile status. Please try again.')
        setLoading(false)
        return
      }

      if (currentUserData && !currentUserData.profilevisible) {
        console.log('User profile is hidden, blocking discovery access')
        setError('PROFILE_HIDDEN')
        setLoading(false)
        return
      }

      // Use the userType from the authenticated user (already validated by main app)
      if (!currentUser.userType) {
        console.warn('UserType not available, but main app should have handled this. Continuing with fallback.');
        setError('Unable to determine user type. Please try refreshing the page.');
        setLoading(false)
        return;
      }

      // Determine the opposite type to fetch
      const targetUserType = currentUser.userType === 'seeker' ? 'provider' : 'seeker'

      // Build query with filters
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          age,
          bio,
          location,
          profilepicture,
          usertype,
          preferences,
          profilevisible
        `)
        .eq('usertype', targetUserType)
        .neq('id', currentUser.id) // Exclude current user
        .not('age', 'is', null) // Only include users who have completed their profile
        .eq('profilevisible', true) // Only show profiles that are visible


      const { data: oppositeUsers, error: usersError } = await query

      if (usersError) {
        console.error('Error fetching opposite type users:', usersError)
        setError('Failed to fetch potential matches')
        return
      }

      // Transform the data to match our interface
      let formattedProfiles: User[] = (oppositeUsers || []).map(profile => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.name || 'Unknown User',
        age: profile.age,
        bio: profile.bio || '',
        location: profile.location || '',
        profilePicture: profile.profilepicture || '/placeholder.svg',
        userType: profile.usertype,
        preferences: profile.preferences || {
          smoking: false,
          drinking: false,
          vegetarian: false,
          pets: false
        }
      }))

      // Only filter out users you've already LIKED (not passed) - safer approach
      try {
        const { data: alreadyLiked } = await supabase
          .from('matches')
          .select('matched_user_id')
          .eq('user_id', currentUser.id)
          .eq('liked', true) // Only filter out likes, not passes

        if (alreadyLiked && alreadyLiked.length > 0) {
          const likedUserIds = alreadyLiked.map(record => record.matched_user_id)
          const beforeCount = formattedProfiles.length
          formattedProfiles = formattedProfiles.filter(profile => 
            !likedUserIds.includes(profile.id)
          )
          const afterCount = formattedProfiles.length
          
          console.log(`🔍 Filtered out ${beforeCount - afterCount} already liked users, ${afterCount} profiles remaining`)
        }
      } catch (filterError) {
        console.warn('Could not filter already liked users, showing all profiles:', filterError)
        // Continue with all profiles if filtering fails
      }

      setProfiles(formattedProfiles)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser?.id) {
      // Clear existing state first to ensure fresh data
      setProfiles([])
      setCurrentIndex(0)
      setError(null)
      // Fetch fresh data
      fetchOppositeTypeUsers()
      console.log('🔄 SwipePage refreshing due to trigger change:', refreshTrigger)
    }
  }, [currentUser, fetchOppositeTypeUsers, refreshTrigger]) // Add refreshTrigger to dependencies

  // Show locked page for quick_access users
  if (isSwipeLocked) {
    return (
      <LockedSwipePage 
        onUpgrade={handleUpgrade}
        userType={currentUser?.userType || ''}
        lockReason="upgrade_required"
      />
    )
  }

  const handleSwipe = async (liked: boolean) => {
    const currentProfile = profiles[currentIndex]
    
    // Always move to next profile first (restore original behavior)
    console.log(liked ? "Liked!" : "Passed!")
    setCurrentIndex((prev) => prev + 1)
    
    // Only save likes to database (restore original functionality)
    if (liked && currentUser?.id) {
      try {
        // Save the like to matches table
        const { error } = await supabase
          .from('matches')
          .insert({
            user_id: currentUser.id,
            matched_user_id: currentProfile.id,
            liked: true,
            created_at: new Date().toISOString()
          })

        if (error) {
          console.error('Error saving match:', error)
        } else {
          console.log('✅ Like saved successfully!')
          
          // Check if it's a mutual match
          const { data: mutualMatch, error: mutualError } = await supabase
            .from('matches')
            .select('*')
            .eq('user_id', currentProfile.id)
            .eq('matched_user_id', currentUser.id)
            .eq('liked', true)
            .single()

          if (mutualMatch && !mutualError) {
            // IT'S A MUTUAL MATCH! 🎉
            console.log('🎉 MUTUAL MATCH FOUND!')
            
            // Create or get existing chat
            await createChatForMatch(currentUser.id, currentProfile.id)
            
            // Show match animation/notification
            alert(`🎉 It's a Match with ${currentProfile.name}! You can now chat!`)
          }
        }
      } catch (err) {
        console.error('Error saving match:', err)
      }
    }
    
    // Optionally track passes in memory for this session only (non-breaking)
    if (!liked && currentUser?.id) {
      // Could add local storage or session storage here for better UX
      // without affecting database or existing functionality
    }
  }

  const createChatForMatch = async (user1Id: string, user2Id: string) => {
    try {
      // Check if chat already exists between these users
      const { data: existingChat, error: chatCheckError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
        .single()

      if (!chatCheckError && existingChat) {
        console.log('✅ Chat already exists:', existingChat.id)
        return existingChat
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating chat:', createError)
        return null
      }

      console.log('✅ New chat created:', newChat?.id)
      return newChat
    } catch (error) {
      console.error('Error in createChatForMatch:', error)
      return null
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      console.log("✅ User logged out successfully")
    } catch (error) {
      console.error("❌ Error logging out:", error)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
          <h2 className="roomeo-heading text-2xl mb-2">Finding Your Perfect Match...</h2>
          <p className="roomeo-body text-emerald-primary/70 text-lg">Looking for compatible roommates 💕</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    const isProfileSetupError = error.includes('User type not set')
    const isProfileHidden = error === 'PROFILE_HIDDEN'
    
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 animate-fade-in">
          <div className="text-6xl mb-4">
            {isProfileSetupError ? '👤' : isProfileHidden ? '🔒' : '⚠️'}
          </div>
          <h2 className="roomeo-heading text-3xl mb-4">
            {isProfileSetupError ? 'Profile Setup Needed' : isProfileHidden ? 'Profile Hidden' : 'Oops!'}
          </h2>
          {isProfileHidden ? (
            <div>
              <p className="roomeo-body text-emerald-primary mb-4">
                Your profile is currently hidden from discovery. To browse and match with others, you need to make your profile visible first.
              </p>
              <p className="text-sm text-emerald-primary/70 mb-6">
                📌 Go to Settings → Privacy & Security → Profile Visibility to unhide your profile.
              </p>
              <button
                onClick={() => {
                  if (onNavigateToSettings) {
                    onNavigateToSettings()
                  } else {
                    // Fallback - reload page and hope user navigates manually
                    alert("Please go to Settings → Privacy & Security to unhide your profile")
                  }
                }}
                className="roomeo-button-primary"
              >
                🔒 Go to Settings
              </button>
            </div>
          ) : (
            <>
              <p className="roomeo-body text-emerald-primary mb-6">{error}</p>
              {isProfileSetupError ? (
                <div>
                  <p className="text-sm text-emerald-primary/70 mb-4">Redirecting to profile setup...</p>
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-primary/30 border-t-emerald-primary mx-auto"></div>
                </div>
              ) : (
                <button
                  onClick={fetchOppositeTypeUsers}
                  className="roomeo-button-primary"
                >
                  Try Again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // No more profiles state
  if (currentIndex >= profiles.length) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-8xl mb-6">🏠</div>
          <h2 className="roomeo-heading text-4xl mb-4">No More Profiles</h2>
          <p className="roomeo-body text-emerald-primary/70 text-xl mb-6">Check back later for new matches!</p>
          <button
            onClick={() => {
              setCurrentIndex(0)
              fetchOppositeTypeUsers()
            }}
            className="roomeo-button-primary"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    )
  }

  const currentProfile = profiles[currentIndex]

  return (
    <div className="bg-mint-cream min-h-screen">
      
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-mint-cream min-h-screen overflow-y-auto">
            <div className="mx-auto max-w-4xl animate-fade-in">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="animate-slide-up">
                  <h1 className="roomeo-heading text-3xl sm:text-4xl mb-3 bg-gradient-to-r from-emerald-primary to-moss-green bg-clip-text text-transparent font-bold">💕 Find Your Roommate</h1>
                  <p className="roomeo-body text-emerald-primary/80 text-lg font-medium max-w-md mx-auto leading-relaxed">Swipe to discover compatible living partners</p>
                </div>
              </div>

              {/* Main Swipe Content */}
              <div className="flex items-center justify-center min-h-[calc(100vh-200px)] relative">
                {/* Left Reject Button */}
                <button
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 size-20 bg-white border-3 border-sage text-alert-red hover:bg-alert-red/10 flex items-center justify-center rounded-full shadow-lg transform hover:scale-110 transition-all group"
                  onClick={() => handleSwipe(false)}
                >
                  <svg
                    className="w-10 h-10 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
                
                {/* Right Accept Button */}
                <button
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 size-24 bg-moss-green hover:bg-moss-green/90 text-white flex items-center justify-center rounded-full shadow-lg transform hover:scale-110 transition-all group"
                  onClick={() => handleSwipe(true)}
                >
                  <svg
                    className="w-12 h-12 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </button>
                
                <div className="w-full max-w-sm mx-auto flex flex-col justify-center">
                  <div className="relative mb-8">
                    <div className="roomeo-card overflow-hidden animate-slide-up">
                      <div className="relative">
                        <Image
                          alt={currentProfile.name}
                          className="w-full h-80 object-cover"
                          src={currentProfile.profilePicture || "/placeholder.svg"}
                          width={400}
                          height={320}
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                          <h2 className="roomeo-heading text-2xl text-white mb-1">
                            {currentProfile.name}, {currentProfile.age}
                          </h2>
                          <p className="roomeo-body text-white font-semibold">
                            {currentProfile.userType === "provider" ? "HAS A PLACE" : "LOOKING FOR A PLACE"}
                          </p>
                          {currentProfile.location && (
                            <p className="roomeo-body text-white/90 text-sm">📍 {currentProfile.location}</p>
                          )}
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex items-center text-emerald-primary space-x-3 flex-wrap gap-2">
                          <span className="flex items-center gap-1 roomeo-body font-semibold text-sm">
                            <svg
                              className={`w-4 h-4 ${currentProfile.preferences?.smoking ? 'text-alert-red' : 'text-moss-green'}`}
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
                            {currentProfile.preferences?.smoking ? "SMOKER" : "NON-SMOKER"}
                          </span>
                          <span className="flex items-center gap-1 roomeo-body font-semibold text-sm">
                            <svg
                              className="w-4 h-4 text-moss-green"
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
                            {currentProfile.preferences?.pets ? "PET-FRIENDLY" : "NO PETS"}
                          </span>
                          {currentProfile.preferences?.vegetarian && (
                            <span className="flex items-center gap-1 roomeo-body font-semibold text-sm">
                              <span className="text-moss-green">🌱</span>
                              VEGETARIAN
                            </span>
                          )}
                          {currentProfile.preferences?.drinking && (
                            <span className="flex items-center gap-1 roomeo-body font-semibold text-sm">
                              <span className="text-moss-green">🍺</span>
                              DRINKS
                            </span>
                          )}
                        </div>
                        {currentProfile.bio && (
                          <p className="roomeo-body text-emerald-primary leading-relaxed border-l-4 border-sage pl-3 text-sm">
                            {currentProfile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Profile counter */}
                  <div className="text-center mb-4">
                    <p className="roomeo-body text-emerald-primary/70 font-semibold text-sm">
                      {currentIndex + 1} OF {profiles.length}
                    </p>
                  </div>
                  
                  {/* Bottom Action Hints */}
                  <div className="flex justify-center gap-8 mt-4 opacity-60">
                    <div className="flex items-center gap-2 text-sm roomeo-body text-emerald-primary">
                      <svg className="h-4 w-4 text-alert-red" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                      <span>Pass</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm roomeo-body text-emerald-primary">
                      <svg className="h-4 w-4 text-moss-green" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <span>Like</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

    </div>
  )
}