// services/friends.ts - Client-side friends operations
import { supabase } from "@/lib/supabase";

export interface Friend {
  id: string
  friendId: string
  name: string
  profilePicture: string | null
  friendsSince: string
}

export interface FriendRequest {
  id: string
  type: 'sent' | 'received'
  userId: string
  name: string
  profilePicture: string | null
  createdAt: string
}

export interface SearchUser {
  id: string
  name: string
  profilePicture: string | null
  location: string | null
  relationshipStatus: 'stranger' | 'friend' | 'request_sent' | 'request_received'
}

// Helper function to ensure user is authenticated
async function ensureAuthenticated() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Authentication required')
  }
  return user
}

// Get friends list
export async function getFriendsList(): Promise<Friend[]> {
  try {
    console.log('🔄 Fetching friends list')
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated()

    // Use the database function if it exists, otherwise direct query
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_friends_list', { user_id: user.id })

    if (functionError) {
      console.log('Function not available, using direct query:', functionError.message)
      
      // Fallback to direct query
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user1_id,
          user2_id,
          created_at,
          user1:users!friendships_user1_id_fkey(id, name, profilepicture),
          user2:users!friendships_user2_id_fkey(id, name, profilepicture)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      if (error) {
        console.error('❌ Error fetching friends:', error)
        throw new Error(error.message || 'Failed to fetch friends')
      }

      // Transform data to friends format
      const friends: Friend[] = (data || []).map(friendship => {
        const isUser1 = friendship.user1_id === user.id
        const friend = isUser1 ? friendship.user2[0] : friendship.user1[0]
        
        return {
          id: friendship.id,
          friendId: friend?.id || '',
          name: friend?.name || 'Unknown',
          profilePicture: friend?.profilepicture || null,
          friendsSince: friendship.created_at
        }
      })

      console.log('✅ Friends list retrieved (direct query):', friends.length)
      return friends

    } else {
      console.log('✅ Friends list retrieved (function):', functionResult?.friends?.length || 0)
      return functionResult?.friends || []
    }

  } catch (error) {
    console.error('❌ Exception fetching friends:', error)
    return []
  }
}

// Get friend requests (sent and received)
export async function getFriendRequests(): Promise<{ sent: FriendRequest[], received: FriendRequest[] }> {
  try {
    console.log('🔄 Fetching friend requests')
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated()

    // Get sent requests
    const { data: sentData, error: sentError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        receiver_id,
        status,
        created_at,
        receiver:users!friend_requests_receiver_id_fkey(id, name, profilepicture)
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending')

    if (sentError) {
      console.error('❌ Error fetching sent requests:', sentError)
    }

    // Get received requests
    const { data: receivedData, error: receivedError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        status,
        created_at,
        sender:users!friend_requests_sender_id_fkey(id, name, profilepicture)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')

    if (receivedError) {
      console.error('❌ Error fetching received requests:', receivedError)
    }

    // Transform sent requests
    const sentRequests: FriendRequest[] = (sentData || []).map(request => ({
      id: request.id,
      type: 'sent' as const,
      userId: request.receiver[0]?.id || '',
      name: request.receiver[0]?.name || 'Unknown',
      profilePicture: request.receiver[0]?.profilepicture || null,
      createdAt: request.created_at
    }))

    // Transform received requests
    const receivedRequests: FriendRequest[] = (receivedData || []).map(request => ({
      id: request.id,
      type: 'received' as const,
      userId: request.sender[0]?.id || '',
      name: request.sender[0]?.name || 'Unknown',
      profilePicture: request.sender[0]?.profilepicture || null,
      createdAt: request.created_at
    }))

    console.log('✅ Friend requests retrieved:', {
      sent: sentRequests.length,
      received: receivedRequests.length
    })

    return { sent: sentRequests, received: receivedRequests }

  } catch (error) {
    console.error('❌ Exception fetching friend requests:', error)
    return { sent: [], received: [] }
  }
}

// Search users
export async function searchUsers(query: string): Promise<SearchUser[]> {
  try {
    if (!query.trim() || query.trim().length < 2) {
      return []
    }

    console.log('🔄 Searching users:', query)
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated()

    // Search users by name
    const { data, error } = await supabase
      .from('users')
      .select('id, name, profilepicture, location')
      .ilike('name', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(20)

    if (error) {
      console.error('❌ Error searching users:', error)
      throw new Error(error.message || 'Search failed')
    }

    // Get current user's friendships and requests to determine relationship status
    const [friendships, friendRequests] = await Promise.all([
      supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending')
    ])

    // Create lookup sets for performance
    const friendIds = new Set()
    friendships.data?.forEach(f => {
      friendIds.add(f.user1_id === user.id ? f.user2_id : f.user1_id)
    })

    const sentRequestIds = new Set()
    const receivedRequestIds = new Set()
    friendRequests.data?.forEach(r => {
      if (r.sender_id === user.id) {
        sentRequestIds.add(r.receiver_id)
      } else {
        receivedRequestIds.add(r.sender_id)
      }
    })

    // Determine relationship status for each user
    const searchResults: SearchUser[] = (data || []).map(searchUser => {
      let relationshipStatus: SearchUser['relationshipStatus'] = 'stranger'
      
      if (friendIds.has(searchUser.id)) {
        relationshipStatus = 'friend'
      } else if (sentRequestIds.has(searchUser.id)) {
        relationshipStatus = 'request_sent'
      } else if (receivedRequestIds.has(searchUser.id)) {
        relationshipStatus = 'request_received'
      }

      return {
        id: searchUser.id,
        name: searchUser.name,
        profilePicture: searchUser.profilepicture,
        location: searchUser.location,
        relationshipStatus
      }
    })

    console.log('✅ User search completed:', searchResults.length, 'results')
    return searchResults

  } catch (error) {
    console.error('❌ Exception searching users:', error)
    throw new Error(error instanceof Error ? error.message : 'Search failed')
  }
}

// Send friend request
export async function sendFriendRequest(receiverId: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('🔄 Sending friend request to:', receiverId)
    
    // Ensure user is authenticated
    const user = await ensureAuthenticated()

    // Use database function if available, otherwise direct insert
    const { data: functionResult, error: functionError } = await supabase
      .rpc('send_friend_request', { receiver_id: receiverId })

    if (functionError) {
      console.log('Function not available, using direct insert:', functionError.message)
      
      // Fallback to direct insert
      const { error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        })

      if (insertError) {
        console.error('❌ Error sending friend request:', insertError)
        return { success: false, error: insertError.message || 'Failed to send friend request' }
      }
    }

    console.log('✅ Friend request sent successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception sending friend request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send friend request' 
    }
  }
}

// Accept friend request
export async function acceptFriendRequest(requestId: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('🔄 Accepting friend request:', requestId)
    
    // Ensure user is authenticated
    await ensureAuthenticated()

    // Use database function if available
    const { data: functionResult, error: functionError } = await supabase
      .rpc('accept_friend_request', { request_id: requestId })

    if (functionError) {
      console.error('❌ Error accepting friend request:', functionError)
      return { success: false, error: functionError.message || 'Failed to accept friend request' }
    }

    console.log('✅ Friend request accepted successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception accepting friend request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to accept friend request' 
    }
  }
}

// Decline friend request
export async function declineFriendRequest(requestId: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('🔄 Declining friend request:', requestId)
    
    // Ensure user is authenticated
    await ensureAuthenticated()

    // Update request status to declined
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', requestId)

    if (error) {
      console.error('❌ Error declining friend request:', error)
      return { success: false, error: error.message || 'Failed to decline friend request' }
    }

    console.log('✅ Friend request declined successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception declining friend request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to decline friend request' 
    }
  }
}

// Cancel friend request
export async function cancelFriendRequest(requestId: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('🔄 Cancelling friend request:', requestId)
    
    // Ensure user is authenticated
    await ensureAuthenticated()

    // Delete the friend request
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)

    if (error) {
      console.error('❌ Error cancelling friend request:', error)
      return { success: false, error: error.message || 'Failed to cancel friend request' }
    }

    console.log('✅ Friend request cancelled successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception cancelling friend request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to cancel friend request' 
    }
  }
}

// Remove friend
export async function removeFriend(friendshipId: string): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('🔄 Removing friend:', friendshipId)
    
    // Ensure user is authenticated
    await ensureAuthenticated()

    // Delete friendship record
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (error) {
      console.error('❌ Error removing friend:', error)
      return { success: false, error: error.message || 'Failed to remove friend' }
    }

    console.log('✅ Friend removed successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception removing friend:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove friend' 
    }
  }
}