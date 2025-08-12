"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getRoomPhotos, getPrimaryRoomPhoto } from "@/services/roomPhotos"
import { RoomPhoto } from "@/types/roomPhotos"
import PhotoGalleryModal from "@/components/roomPhotos/PhotoGalleryModal"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
  age?: number
  bio?: string
  location?: string
  area?: string
  budget?: number
  universityAffiliation?: string
  professionalStatus?: "student" | "employed" | "unemployed"
  preferences?: {
    smoking: boolean
    drinking: boolean
    vegetarian: boolean
    pets: boolean
  }
  userType?: "seeker" | "provider" | null
  roomPhotos?: RoomPhoto[]
  primaryRoomPhoto?: RoomPhoto
  roomPhotoCount?: number
}

interface SwipePageProps {
  user?: User // Make it optional since we'll fetch from useAuth
}

// Filter functions
const applyFilters = (allProfiles: User[], filters: any) => {
  let filteredProfiles = [...allProfiles]

  // Age filter
  if (filters.ageMin) {
    filteredProfiles = filteredProfiles.filter(p => p.age && p.age >= parseInt(filters.ageMin))
  }
  if (filters.ageMax) {
    filteredProfiles = filteredProfiles.filter(p => p.age && p.age <= parseInt(filters.ageMax))
  }

  // University affiliation filter
  if (filters.universityAffiliation) {
    filteredProfiles = filteredProfiles.filter(p => 
      p.universityAffiliation && 
      p.universityAffiliation.toLowerCase().includes(filters.universityAffiliation.toLowerCase())
    )
  }

  // Professional status filter
  if (filters.professionalStatus) {
    filteredProfiles = filteredProfiles.filter(p => p.professionalStatus === filters.professionalStatus)
  }

  // Budget filter (pricing)
  if (filters.budgetMin) {
    filteredProfiles = filteredProfiles.filter(p => p.budget && p.budget >= parseInt(filters.budgetMin))
  }
  if (filters.budgetMax) {
    filteredProfiles = filteredProfiles.filter(p => p.budget && p.budget <= parseInt(filters.budgetMax))
  }

  // Area filter
  if (filters.area) {
    filteredProfiles = filteredProfiles.filter(p => 
      (p.area && p.area.toLowerCase().includes(filters.area.toLowerCase())) ||
      (p.location && p.location.toLowerCase().includes(filters.area.toLowerCase()))
    )
  }

  return filteredProfiles
}

export default function SwipePage({ user: propUser }: SwipePageProps = {}) {
  const { user: authUser, logout } = useAuth()
  const [profiles, setProfiles] = useState<User[]>([])
  const [allProfiles, setAllProfiles] = useState<User[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    ageMin: "",
    ageMax: "",
    universityAffiliation: "",
    professionalStatus: "",
    budgetMin: "",
    budgetMax: "",
    area: ""
  })
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [tempFilters, setTempFilters] = useState({
    ageMin: "",
    ageMax: "",
    universityAffiliation: "",
    professionalStatus: "",
    budgetMin: "",
    budgetMax: "",
    area: ""
  })

  // Use the user from props or auth
  const currentUser = propUser || authUser

  useEffect(() => {
    if (currentUser?.id) {
      fetchOppositeTypeUsers()
    }
  }, [currentUser])

  // Apply filters only when filters state changes (not tempFilters)
  useEffect(() => {
    const filteredProfiles = applyFilters(allProfiles, filters)
    setProfiles(filteredProfiles)
    
    // Count active filters
    const filterCount = Object.values(filters).filter(value => value !== "").length
    setActiveFiltersCount(filterCount)
  }, [allProfiles, filters])

  // Initialize tempFilters when filters change
  useEffect(() => {
    setTempFilters(filters)
  }, [filters])

  const handleTempFilterChange = (filterKey: string, value: string) => {
    setTempFilters(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }

  const applyFiltersFromTemp = () => {
    setFilters(tempFilters)
  }

  const resetFilters = () => {
    const resetState = {
      ageMin: "",
      ageMax: "",
      universityAffiliation: "",
      professionalStatus: "",
      budgetMin: "",
      budgetMax: "",
      area: ""
    }
    setFilters(resetState)
    setTempFilters(resetState)
  }

  const fetchOppositeTypeUsers = async () => {
    if (!currentUser?.id) {
      setError("User not found")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First, get the current user's profile to determine their type
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('users')
        .select('usertype')
        .eq('id', currentUser.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        setError('Failed to fetch user profile')
        return
      }

      if (!currentUserProfile?.usertype) {
        setError('User type not set. Please complete your profile setup.')
        return
      }

      // Determine the opposite type to fetch
      const targetUserType = currentUserProfile.usertype === 'seeker' ? 'provider' : 'seeker'

      // Fetch users with the opposite type (restore original functionality first)
      const { data: oppositeUsers, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          age,
          bio,
          location,
          area,
          budget,
          profilepicture,
          usertype,
          universityaffiliation,
          professionalstatus,
          preferences
        `)
        .eq('usertype', targetUserType)
        .neq('id', currentUser.id) // Exclude current user
        .not('age', 'is', null) // Only include users who have completed their profile

      if (usersError) {
        console.error('Error fetching opposite type users:', usersError)
        setError('Failed to fetch potential matches')
        return
      }

      // Transform the data to match our interface and fetch room photos for providers
      let formattedProfiles: User[] = await Promise.all(
        (oppositeUsers || []).map(async (profile) => {
          let roomPhotos: RoomPhoto[] = [];
          let primaryRoomPhoto: RoomPhoto | null = null;
          let roomPhotoCount = 0;

          // Fetch room photos for providers
          if (profile.usertype === 'provider') {
            try {
              roomPhotos = await getRoomPhotos(profile.id);
              roomPhotoCount = roomPhotos.length;
              
              if (roomPhotos.length > 0) {
                primaryRoomPhoto = roomPhotos.find(photo => photo.is_primary) || roomPhotos[0];
              }
            } catch (photoError) {
              console.warn(`Failed to fetch room photos for user ${profile.id}:`, photoError);
            }
          }

          return {
            id: profile.id,
            email: profile.email || '',
            name: profile.name || 'Unknown User',
            age: profile.age,
            bio: profile.bio || '',
            location: profile.location || '',
            area: profile.area || '',
            budget: profile.budget || undefined,
            universityAffiliation: profile.universityaffiliation || '',
            professionalStatus: profile.professionalstatus as "student" | "employed" | "unemployed" | undefined,
            profilePicture: profile.profilepicture || '/placeholder.svg',
            userType: profile.usertype,
            preferences: profile.preferences || {
              smoking: false,
              drinking: false,
              vegetarian: false,
              pets: false
            },
            roomPhotos,
            primaryRoomPhoto: primaryRoomPhoto || undefined,
            roomPhotoCount
          };
        })
      )

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

      setAllProfiles(formattedProfiles)
      setProfiles(formattedProfiles)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
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
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#44C76F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-[#004D40] transform -skew-x-2">FINDING MATCHES...</h2>
          <p className="text-lg font-bold text-[#004D40] mt-2">Looking for compatible roommates</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-black text-[#004D40] mb-4 transform -skew-x-2">OOPS!</h2>
          <p className="text-lg font-bold text-[#004D40] mb-6">{error}</p>
          <button
            onClick={fetchOppositeTypeUsers}
            className="bg-[#44C76F] text-[#004D40] font-black px-6 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    )
  }

  // No more profiles state
  if (currentIndex >= profiles.length) {
    return (
      <div className="bg-[#F2F5F1] text-[#004D40] min-h-screen">
        <div className="flex flex-col min-h-screen">
          {/* Header - Same as main component */}
          <header className="bg-[#004D40] border-b-4 border-[#44C76F] sticky top-0 z-10">
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#44C76F] border-2 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#F2F5F1]">
                  <span className="text-[#004D40] font-black text-sm transform -rotate-3">R</span>
                </div>
                <h1 className="text-2xl font-black text-[#F2F5F1] transform -skew-x-3">ROOMIO</h1>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative text-[#F2F5F1] hover:text-[#44C76F] focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                    />
                  </svg>
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#44C76F] text-[#004D40] text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#F2F5F1]">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-[#F2F5F1] hover:text-[#44C76F] focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
                <img
                  alt="User Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#44C76F]"
                  src={currentUser?.profilePicture || "/placeholder.svg?height=40&width=40"}
                />
              </div>
            </nav>
          </header>
          
          {/* Filter Dropdown - Same as main component */}
          {showFilters && (
            <div className="bg-[#004D40] border-b-4 border-[#44C76F] sticky top-20 z-10">
              <div className="container mx-auto px-6 py-4">
                <div className="bg-[#B7C8B5] rounded-lg border-4 border-[#004D40] p-4 shadow-[4px_4px_0px_0px_#004D40]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-[#004D40] transform -skew-x-2">FILTER MATCHES</h3>
                    <button
                      onClick={resetFilters}
                      className="text-[#004D40] hover:text-[#44C76F] font-black text-sm underline"
                    >
                      RESET ALL
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-[#004D40] font-black text-sm">
                      {activeFiltersCount > 0 ? `NO MATCHES FOR CURRENT FILTERS (${activeFiltersCount} ACTIVE)` : `NO PROFILES AVAILABLE`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* No profiles message */}
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl mb-6">🏠</div>
              <h2 className="text-4xl font-black text-[#004D40] mb-4 transform -skew-x-2">NO MORE PROFILES</h2>
              <p className="text-xl font-bold text-[#004D40] mb-6">
                {activeFiltersCount > 0 ? "TRY ADJUSTING YOUR FILTERS" : "CHECK BACK LATER FOR NEW MATCHES!"}
              </p>
              <div className="w-24 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-6"></div>
              <div className="space-y-4">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="bg-[#44C76F] text-[#004D40] font-black px-6 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all mr-4"
                  >
                    CLEAR FILTERS
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentIndex(0)
                    fetchOppositeTypeUsers()
                  }}
                  className="bg-[#44C76F] text-[#004D40] font-black px-6 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                >
                  REFRESH
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentProfile = profiles[currentIndex]

  return (
    <div className="bg-[#F2F5F1] text-[#004D40] min-h-screen">
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-[#004D40] border-b-4 border-[#44C76F] sticky top-0 z-10">
          <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#44C76F] border-2 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#F2F5F1]">
                <span className="text-[#004D40] font-black text-sm transform -rotate-3">R</span>
              </div>
              <h1 className="text-2xl font-black text-[#F2F5F1] transform -skew-x-3">ROOMIO</h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                FIND ROOMMATES
              </a>
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                MY MATCHES
              </a>
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                EXPENSES
              </a>
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                MARKETPLACE
              </a>
            </div>
            <div className="flex items-center gap-4">
              {/* Filter Button */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="relative text-[#F2F5F1] hover:text-[#44C76F] focus:outline-none"
                title="Filter matches"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                  />
                </svg>
                {/* Active filters badge */}
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#44C76F] text-[#004D40] text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#F2F5F1]">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button className="text-[#F2F5F1] hover:text-[#44C76F] focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              <button 
                onClick={handleLogout}
                className="text-[#F2F5F1] hover:text-[#44C76F] focus:outline-none"
                title="Logout"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
              <img
                alt="User Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#44C76F]"
                src={currentUser?.profilePicture || "/placeholder.svg?height=40&width=40"}
              />
            </div>
          </nav>
        </header>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="bg-[#004D40] border-b-4 border-[#44C76F] sticky top-20 z-10">
            <div className="container mx-auto px-6 py-4">
              <div className="bg-[#B7C8B5] rounded-lg border-4 border-[#004D40] p-4 shadow-[4px_4px_0px_0px_#004D40]">
                <div className="mb-4">
                  <h3 className="text-xl font-black text-[#004D40] transform -skew-x-2 text-center">FILTER MATCHES</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Age Range */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[#004D40]">AGE RANGE</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={tempFilters.ageMin}
                        onChange={(e) => handleTempFilterChange('ageMin', e.target.value)}
                        className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                        min="18"
                        max="100"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={tempFilters.ageMax}
                        onChange={(e) => handleTempFilterChange('ageMax', e.target.value)}
                        className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                        min="18"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* University Affiliation */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[#004D40]">UNIVERSITY</label>
                    <input
                      type="text"
                      placeholder="e.g. UW, Harvard, etc."
                      value={tempFilters.universityAffiliation}
                      onChange={(e) => handleTempFilterChange('universityAffiliation', e.target.value)}
                      className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                    />
                  </div>

                  {/* Professional Status */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[#004D40]">WORK STATUS</label>
                    <select
                      value={tempFilters.professionalStatus}
                      onChange={(e) => handleTempFilterChange('professionalStatus', e.target.value)}
                      className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                    >
                      <option value="">Any</option>
                      <option value="student">Student</option>
                      <option value="employed">Employed</option>
                      <option value="unemployed">Unemployed</option>
                    </select>
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[#004D40]">BUDGET RANGE ($)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={tempFilters.budgetMin}
                        onChange={(e) => handleTempFilterChange('budgetMin', e.target.value)}
                        className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={tempFilters.budgetMax}
                        onChange={(e) => handleTempFilterChange('budgetMax', e.target.value)}
                        className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Area */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-[#004D40]">AREA</label>
                    <input
                      type="text"
                      placeholder="e.g. Downtown, University District"
                      value={tempFilters.area}
                      onChange={(e) => handleTempFilterChange('area', e.target.value)}
                      className="w-full border-2 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] p-2 rounded text-sm"
                    />
                  </div>
                </div>
                
                {/* Apply and Reset Buttons */}
                <div className="mt-6 flex gap-4 justify-center">
                  <button
                    onClick={resetFilters}
                    className="bg-[#F2F5F1] text-[#004D40] font-black px-6 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                  >
                    RESET ALL
                  </button>
                  <button
                    onClick={applyFiltersFromTemp}
                    className="bg-[#44C76F] text-[#004D40] font-black px-8 py-3 rounded-lg border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                  >
                    APPLY FILTERS
                  </button>
                </div>
                
                {/* Results count */}
                <div className="mt-4 text-center">
                  <p className="text-[#004D40] font-black text-sm">
                    SHOWING {profiles.length} OF {allProfiles.length} PROFILES
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center p-4 bg-[#F2F5F1] min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center min-h-[calc(100vh-160px)]">
            <div className="relative mb-8">
              <div className="bg-[#B7C8B5] rounded-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] overflow-hidden transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] transition-all">
                <div className="relative">
                  {/* Display primary room photo for providers, profile picture for seekers */}
                  <img
                    alt={currentProfile.name}
                    className="w-full h-80 object-cover cursor-pointer"
                    src={
                      currentProfile.userType === "provider" && currentProfile.primaryRoomPhoto
                        ? currentProfile.primaryRoomPhoto.photo_url
                        : currentProfile.profilePicture || "/placeholder.svg"
                    }
                    onClick={() => {
                      if (currentProfile.userType === "provider" && currentProfile.roomPhotos && currentProfile.roomPhotos.length > 0) {
                        setIsGalleryOpen(true);
                      }
                    }}
                  />
                  
                  {/* Photo count badge for providers with room photos */}
                  {currentProfile.userType === "provider" && currentProfile.roomPhotoCount && currentProfile.roomPhotoCount > 0 && (
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
                      📷 {currentProfile.roomPhotoCount} photo{currentProfile.roomPhotoCount === 1 ? '' : 's'}
                    </div>
                  )}
                  
                  {/* No photos indicator for providers */}
                  {currentProfile.userType === "provider" && (!currentProfile.roomPhotoCount || currentProfile.roomPhotoCount === 0) && (
                    <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      No room photos
                    </div>
                  )}
                  
                  {/* View Photos hint for providers with photos */}
                  {currentProfile.userType === "provider" && currentProfile.roomPhotoCount && currentProfile.roomPhotoCount > 1 && (
                    <div className="absolute bottom-20 left-4 right-4 bg-black/50 text-white p-2 rounded-lg text-center">
                      <p className="text-sm font-bold">Tap to view all photos</p>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                    <h2 className="text-2xl font-black transform -skew-x-1">
                      {currentProfile.name}, {currentProfile.age}
                    </h2>
                    <p className="text-base font-bold">
                      {currentProfile.userType === "provider" ? "HAS A PLACE" : "LOOKING FOR A PLACE"}
                    </p>
                    {currentProfile.location && (
                      <p className="text-sm font-bold opacity-90">📍 {currentProfile.location}</p>
                    )}
                    {currentProfile.userType === "provider" && currentProfile.budget && (
                      <p className="text-sm font-bold opacity-90">💰 ${currentProfile.budget}/month</p>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center text-[#004D40] space-x-3 flex-wrap gap-2">
                    <span className="flex items-center gap-1 font-black text-sm">
                      <svg
                        className={`w-4 h-4 ${currentProfile.preferences?.smoking ? 'text-red-500' : 'text-[#44C76F]'}`}
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
                      {currentProfile.preferences?.pets ? "PET-FRIENDLY" : "NO PETS"}
                    </span>
                    {currentProfile.preferences?.vegetarian && (
                      <span className="flex items-center gap-1 font-black text-sm">
                        <span className="text-[#44C76F]">🌱</span>
                        VEGETARIAN
                      </span>
                    )}
                    {currentProfile.preferences?.drinking && (
                      <span className="flex items-center gap-1 font-black text-sm">
                        <span className="text-[#44C76F]">🍺</span>
                        DRINKS
                      </span>
                    )}
                  </div>
                  {currentProfile.bio && (
                    <p className="text-[#004D40] font-bold leading-relaxed border-l-4 border-[#44C76F] pl-3 text-sm">
                      {currentProfile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Profile counter */}
            <div className="text-center mb-4">
              <p className="text-[#004D40] font-black text-sm">
                {currentIndex + 1} OF {profiles.length}
                {activeFiltersCount > 0 && (
                  <span className="block text-xs text-[#44C76F] mt-1">
                    {activeFiltersCount} FILTER{activeFiltersCount > 1 ? 'S' : ''} ACTIVE
                  </span>
                )}
              </p>
            </div>

            <div className="flex justify-between items-center">
              {/* Cross/Pass Button - Left Side */}
              <button
                className="size-20 bg-[#F2F5F1] border-4 border-[#004D40] text-red-500 hover:bg-red-50 flex items-center justify-center rounded-full shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all group"
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

              {/* Tick/Like Button - Right Side */}
              <button
                className="size-24 bg-[#44C76F] text-[#004D40] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] flex items-center justify-center rounded-full transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] transition-all group"
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
            </div>
          </div>
        </main>
      </div>

      {/* Photo Gallery Modal */}
      {currentProfile && currentProfile.roomPhotos && (
        <PhotoGalleryModal
          photos={currentProfile.roomPhotos}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          userName={currentProfile.name}
          userAge={currentProfile.age}
          userLocation={currentProfile.location}
          userBudget={currentProfile.budget}
          userBio={currentProfile.bio}
          onLike={() => handleSwipe(true)}
          onPass={() => handleSwipe(false)}
        />
      )}
    </div>
  )
}