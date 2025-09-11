// services/matches.ts
import { supabase } from '@/lib/supabase'

export interface Match {
  id: string
  user_id: string
  matched_user_id: string
  liked: boolean
  created_at: string
  updated_at?: string
}

export interface MatchWithUser extends Match {
  matched_user: {
    id: string
    name: string
    profilePicture: string
    age: number
    bio: string
    location: string
    userType: 'seeker' | 'provider'
  }
}

/**
 * Save a match/like to the database
 */
export const saveMatch = async (userId: string, matchedUserId: string, liked: boolean): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: userId,
        matched_user_id: matchedUserId,
        liked,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving match:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error saving match:', error)
    return { success: false, error: 'Failed to save match' }
  }
}

/**
 * Get all matches for a user (people they liked)
 */
export const getUserMatches = async (userId: string): Promise<{ success: boolean; matches?: MatchWithUser[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        matched_user:users!matches_matched_user_id_fkey (
          id,
          name,
          profilePicture,
          age,
          bio,
          location,
          userType
        )
      `)
      .eq('user_id', userId)
      .eq('liked', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching matches:', error)
      return { success: false, error: error.message }
    }

    return { success: true, matches: data as MatchWithUser[] }
  } catch (error) {
    console.error('Unexpected error fetching matches:', error)
    return { success: false, error: 'Failed to fetch matches' }
  }
}

/**
 * Check if there's a mutual match (both users liked each other)
 */
export const checkMutualMatch = async (userId: string, otherUserId: string): Promise<{ success: boolean; isMutual?: boolean; error?: string }> => {
  try {
    // Check if both users liked each other
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user_id.eq.${userId},matched_user_id.eq.${otherUserId},liked.eq.true),and(user_id.eq.${otherUserId},matched_user_id.eq.${userId},liked.eq.true)`)

    if (error) {
      console.error('Error checking mutual match:', error)
      return { success: false, error: error.message }
    }

    // If we have 2 records, it's a mutual match
    const isMutual = data && data.length === 2

    return { success: true, isMutual }
  } catch (error) {
    console.error('Unexpected error checking mutual match:', error)
    return { success: false, error: 'Failed to check mutual match' }
  }
}

/**
 * Get mutual matches for a user
 */
export const getMutualMatches = async (userId: string): Promise<{ success: boolean; matches?: MatchWithUser[]; error?: string }> => {
  try {
    // Get all users that the current user liked
    const { data: userLikes, error: likesError } = await supabase
      .from('matches')
      .select('matched_user_id')
      .eq('user_id', userId)
      .eq('liked', true)

    if (likesError) {
      console.error('Error fetching user likes:', likesError)
      return { success: false, error: likesError.message }
    }

    if (!userLikes || userLikes.length === 0) {
      return { success: true, matches: [] }
    }

    const likedUserIds = userLikes.map(like => like.matched_user_id)

    // Get all users that liked the current user back
    const { data: mutualMatches, error: mutualError } = await supabase
      .from('matches')
      .select(`
        *,
        matched_user:users!matches_user_id_fkey (
          id,
          name,
          profilePicture,
          age,
          bio,
          location,
          userType
        )
      `)
      .eq('matched_user_id', userId)
      .eq('liked', true)
      .in('user_id', likedUserIds)

    if (mutualError) {
      console.error('Error fetching mutual matches:', mutualError)
      return { success: false, error: mutualError.message }
    }

    return { success: true, matches: mutualMatches as MatchWithUser[] }
  } catch (error) {
    console.error('Unexpected error fetching mutual matches:', error)
    return { success: false, error: 'Failed to fetch mutual matches' }
  }
}

/**
 * Remove a match (delete only the current user's like record) so they can re-match later
 */
export const removeMatch = async (userId: string, matchedUserId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`🗑️ Removing match from ${userId} to ${matchedUserId} (unidirectional)`)
    
    // Delete only the current user's like record (A -> B)
    // Keep the other person's like record (B -> A) so if A likes B again, they immediately match
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('user_id', userId)
      .eq('matched_user_id', matchedUserId)
      .eq('liked', true)

    if (error) {
      console.error('Error removing match:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Match removed successfully - user can re-match by liking again')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error removing match:', error)
    return { success: false, error: 'Failed to remove match' }
  }
}