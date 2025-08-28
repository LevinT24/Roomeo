// services/roommate-matching.ts - Roommate matching service
import { supabase } from '@/lib/supabase'
import type {
  UserRole,
  RoommateUser,
  RoommateProfile,
  RoomImage,
  RoomDetails,
  SeekerPreferences,
  UserMatch,
  ProfileFormData,
  RoomDetailsFormData,
  SeekerPreferencesFormData,
  ProfileSetupResponse,
  DiscoverProfilesResponse,
  MatchActionResponse
} from '@/types/roommate'

/**
 * USER ROLE AND PROFILE SETUP
 */
export const setUserRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        user_role: role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error setting user role:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error setting user role:', error)
    return { success: false, error: 'Failed to set user role' }
  }
}

export const setupUserProfile = async (
  userId: string,
  profileData: ProfileFormData,
  roomData?: RoomDetailsFormData,
  preferences?: SeekerPreferencesFormData
): Promise<ProfileSetupResponse> => {
  try {
    // Start transaction-like operations
    const updates: any[] = []

    // Update user profile
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .update({
        name: profileData.name,
        age: profileData.age,
        gender: profileData.gender,
        profession: profileData.profession,
        bio: profileData.bio,
        hobbies: profileData.hobbies,
        religion: profileData.religion || null,
        ethnicity: profileData.ethnicity || null,
        smoking: profileData.smoking,
        drinking: profileData.drinking,
        pets: profileData.pets,
        budget_min: profileData.budget_min || null,
        budget_max: profileData.budget_max || null,
        location: profileData.location,
        preferences: profileData.preferences || null,
        profile_completed: true, // Will be validated by trigger for providers
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (userError) {
      console.error('Error updating user profile:', userError)
      return { success: false, error: userError.message }
    }

    // Handle room details for providers
    if (roomData && updatedUser.user_role === 'provider') {
      const { error: roomError } = await supabase
        .from('room_details')
        .upsert({
          user_id: userId,
          room_type: roomData.room_type,
          rent_amount: roomData.rent_amount,
          deposit_amount: roomData.deposit_amount || null,
          available_from: roomData.available_from || null,
          lease_duration: roomData.lease_duration || null,
          furnished: roomData.furnished,
          utilities_included: roomData.utilities_included,
          amenities: roomData.amenities,
          house_rules: roomData.house_rules,
          description: roomData.description || null,
          address: roomData.address,
          neighborhood: roomData.neighborhood || null,
          updated_at: new Date().toISOString()
        })

      if (roomError) {
        console.error('Error saving room details:', roomError)
        return { success: false, error: roomError.message }
      }
    }

    // Handle seeker preferences
    if (preferences && updatedUser.user_role === 'seeker') {
      const { error: preferencesError } = await supabase
        .from('seeker_preferences')
        .upsert({
          user_id: userId,
          preferred_gender: preferences.preferred_gender || null,
          age_range_min: preferences.age_range_min || null,
          age_range_max: preferences.age_range_max || null,
          preferred_location: preferences.preferred_location || null,
          max_budget: preferences.max_budget || null,
          preferred_room_type: preferences.preferred_room_type || null,
          lifestyle_preferences: preferences.lifestyle_preferences || null,
          deal_breakers: preferences.deal_breakers,
          updated_at: new Date().toISOString()
        })

      if (preferencesError) {
        console.error('Error saving seeker preferences:', preferencesError)
        return { success: false, error: preferencesError.message }
      }
    }

    return { success: true, user: updatedUser as RoommateUser }
  } catch (error) {
    console.error('Unexpected error setting up profile:', error)
    return { success: false, error: 'Failed to setup profile' }
  }
}

/**
 * ROOM IMAGE MANAGEMENT
 */
export const uploadRoomImages = async (
  userId: string,
  images: File[]
): Promise<{ success: boolean; images?: RoomImage[]; error?: string }> => {
  try {
    const uploadedImages: RoomImage[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}_${i}.${fileExt}`
      const filePath = `room-images/${userId}/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('roommate-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        continue // Skip this image but continue with others
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('roommate-images')
        .getPublicUrl(filePath)

      // Save to database
      const { data: imageRecord, error: dbError } = await supabase
        .from('room_images')
        .insert({
          user_id: userId,
          image_url: urlData.publicUrl,
          image_order: i,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (!dbError && imageRecord) {
        uploadedImages.push(imageRecord as RoomImage)
      }
    }

    if (uploadedImages.length === 0) {
      return { success: false, error: 'No images were uploaded successfully' }
    }

    return { success: true, images: uploadedImages }
  } catch (error) {
    console.error('Unexpected error uploading images:', error)
    return { success: false, error: 'Failed to upload images' }
  }
}

export const deleteRoomImage = async (imageId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get image details first
    const { data: image, error: fetchError } = await supabase
      .from('room_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !image) {
      return { success: false, error: 'Image not found' }
    }

    // Delete from storage
    const filePath = image.image_url.split('/').pop()
    if (filePath) {
      await supabase.storage
        .from('roommate-images')
        .remove([`room-images/${userId}/${filePath}`])
    }

    // Delete from database
    const { error } = await supabase
      .from('room_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting image:', error)
    return { success: false, error: 'Failed to delete image' }
  }
}

/**
 * PROFILE DISCOVERY
 */
export const getDiscoverProfiles = async (
  currentUserId: string,
  page: number = 1,
  limit: number = 10,
  filters?: {
    ageMin?: number;
    ageMax?: number;
    gender?: string;
    location?: string;
    budgetMax?: number;
    roomType?: string;
  }
): Promise<DiscoverProfilesResponse> => {
  try {
    const offset = (page - 1) * limit

    // Get current user's role and preferences
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select(`
        user_role,
        seeker_preferences (*),
        age,
        gender,
        location
      `)
      .eq('id', currentUserId)
      .single()

    if (userError || !currentUser) {
      return { success: false, error: 'User not found' }
    }

    // Get users that this user has already interacted with
    const { data: existingMatches } = await supabase
      .from('user_matches')
      .select('target_user_id')
      .eq('user_id', currentUserId)

    const excludeIds = [currentUserId, ...(existingMatches?.map(m => m.target_user_id) || [])]

    // Build query for opposite role
    const targetRole = currentUser.user_role === 'seeker' ? 'provider' : 'seeker'
    
    // Determine if we need to join room_details based on filters
    const needsRoomDetailsJoin = targetRole === 'provider' && filters && 
      (filters.budgetMax || (filters.roomType && filters.roomType !== ''))
    
    const selectClause = needsRoomDetailsJoin 
      ? `*,room_images (*),room_details!inner (*),seeker_preferences (*)`
      : `*,room_images (*),room_details (*),seeker_preferences (*)`
    
    let query = supabase
      .from('users')
      .select(selectClause)
      .eq('user_role', targetRole)
      .eq('profile_completed', true)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('created_at', { ascending: false })

    // Apply filters based on preferences
    const preferences = currentUser.seeker_preferences?.[0]
    if (preferences) {
      if (preferences.preferred_gender && preferences.preferred_gender !== 'any') {
        query = query.eq('gender', preferences.preferred_gender)
      }
      if (preferences.age_range_min) {
        query = query.gte('age', preferences.age_range_min)
      }
      if (preferences.age_range_max) {
        query = query.lte('age', preferences.age_range_max)
      }
      if (preferences.preferred_location) {
        query = query.ilike('location', `%${preferences.preferred_location}%`)
      }
    }

    // Apply UI filters (these override preferences if provided)
    if (filters) {
      if (filters.ageMin) {
        query = query.gte('age', filters.ageMin)
      }
      if (filters.ageMax) {
        query = query.lte('age', filters.ageMax)
      }
      if (filters.gender && filters.gender !== '') {
        query = query.eq('gender', filters.gender)
      }
      if (filters.location && filters.location !== '') {
        query = query.ilike('location', `%${filters.location}%`)
      }
      
      // Budget filter - only applies for seekers looking at providers
      if (filters.budgetMax && targetRole === 'provider') {
        query = query.lte('room_details.rent_amount', filters.budgetMax)
      }
      
      // Room type filter - only applies for seekers looking at providers
      if (filters.roomType && filters.roomType !== '' && targetRole === 'provider') {
        query = query.eq('room_details.room_type', filters.roomType)
      }
    }

    const { data: profiles, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching discover profiles:', error)
      return { success: false, error: error.message }
    }

    // Check for mutual matches
    const profileIds = profiles?.map(p => p.id) || []
    const { data: mutualMatches } = await supabase
      .from('user_matches')
      .select('user_id')
      .in('user_id', profileIds)
      .eq('target_user_id', currentUserId)
      .eq('match_type', 'like')

    const mutualMatchIds = new Set(mutualMatches?.map(m => m.user_id) || [])

    // Format profiles
    const formattedProfiles: RoommateProfile[] = (profiles || []).map(profile => ({
      ...profile,
      is_mutual_match: mutualMatchIds.has(profile.id),
      // Calculate distance if locations are available (simplified)
      distance: calculateDistance(currentUser.location, profile.location)
    }))

    return { 
      success: true, 
      profiles: formattedProfiles,
      has_more: profiles?.length === limit,
      page
    }
  } catch (error) {
    console.error('Unexpected error fetching discover profiles:', error)
    return { success: false, error: 'Failed to fetch profiles' }
  }
}

/**
 * MATCHING ACTIONS
 */
export const performMatchAction = async (
  userId: string,
  targetUserId: string,
  action: 'like' | 'pass' | 'super_like'
): Promise<MatchActionResponse> => {
  try {
    // Record the match action
    const { data: match, error: matchError } = await supabase
      .from('user_matches')
      .upsert({
        user_id: userId,
        target_user_id: targetUserId,
        match_type: action
      })
      .select()
      .single()

    if (matchError) {
      console.error('Error recording match action:', matchError)
      return { success: false, error: matchError.message }
    }

    let isMutualMatch = false

    // Check for mutual like if action is 'like' or 'super_like'
    if (action === 'like' || action === 'super_like') {
      const { data: existingMatch, error: checkError } = await supabase
        .from('user_matches')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('target_user_id', userId)
        .in('match_type', ['like', 'super_like'])
        .single()

      if (!checkError && existingMatch) {
        isMutualMatch = true
        
        // Could trigger notifications, create chat, etc. here
        console.log(`🎉 Mutual match detected between ${userId} and ${targetUserId}`)
      }
    }

    return { 
      success: true, 
      is_mutual_match: isMutualMatch,
      match_id: match?.id 
    }
  } catch (error) {
    console.error('Unexpected error performing match action:', error)
    return { success: false, error: 'Failed to perform match action' }
  }
}

export const getUserMatches = async (userId: string) => {
  try {
    const { data: matches, error } = await supabase
      .from('user_matches')
      .select(`
        *,
        target_user:users!user_matches_target_user_id_fkey (
          *,
          room_images (*),
          room_details (*),
          seeker_preferences (*)
        )
      `)
      .eq('user_id', userId)
      .eq('match_type', 'like')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    // Filter for mutual matches
    const mutualMatches = []
    for (const match of matches || []) {
      const { data: reverseMatch } = await supabase
        .from('user_matches')
        .select('id')
        .eq('user_id', match.target_user_id)
        .eq('target_user_id', userId)
        .in('match_type', ['like', 'super_like'])
        .single()

      if (reverseMatch) {
        mutualMatches.push({
          ...match.target_user,
          match_date: match.created_at
        })
      }
    }

    return { success: true, matches: mutualMatches }
  } catch (error) {
    console.error('Unexpected error getting user matches:', error)
    return { success: false, error: 'Failed to get matches' }
  }
}

/**
 * PROFILE UTILITIES
 */
export const getFullProfile = async (userId: string): Promise<{ success: boolean; profile?: RoommateProfile; error?: string }> => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select(`
        *,
        room_images (*),
        room_details (*),
        seeker_preferences (*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, profile: profile as RoommateProfile }
  } catch (error) {
    console.error('Unexpected error getting full profile:', error)
    return { success: false, error: 'Failed to get profile' }
  }
}

/**
 * UTILITY FUNCTIONS
 */
function calculateDistance(location1?: string, location2?: string): number | undefined {
  // Simplified distance calculation
  // In a real app, you'd use geolocation APIs
  if (!location1 || !location2) return undefined
  
  // Mock distance calculation based on string similarity
  const similarity = location1.toLowerCase() === location2.toLowerCase() ? 0 : Math.random() * 50
  return Math.round(similarity)
}

export const validateProviderImages = async (userId: string): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const { data: images, error } = await supabase
      .from('room_images')
      .select('id')
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    const count = images?.length || 0
    return { 
      success: true, 
      count,
      error: count < 5 ? 'Providers must upload at least 5 room images' : undefined
    }
  } catch (error) {
    console.error('Unexpected error validating provider images:', error)
    return { success: false, error: 'Failed to validate images' }
  }
}