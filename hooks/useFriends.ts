// hooks/useFriends.ts - Client-side friends management
import { useState, useEffect, useCallback } from 'react'
import {
  getFriendsList,
  getFriendRequests,
  searchUsers as searchUsersService,
  sendFriendRequest as sendFriendRequestService,
  acceptFriendRequest as acceptFriendRequestService,
  declineFriendRequest as declineFriendRequestService,
  removeFriend as removeFriendService,
  Friend,
  FriendRequest,
  SearchUser
} from '@/services/friends'

export type { Friend, FriendRequest, SearchUser }

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    try {
      const friendsList = await getFriendsList()
      setFriends(friendsList)
      setError('') // Clear any previous errors
    } catch (err) {
      console.error('Error fetching friends:', err)
      setError('Failed to fetch friends')
      setFriends([])
    }
  }, [])

  // Fetch friend requests
  const fetchRequests = useCallback(async () => {
    try {
      const { sent, received } = await getFriendRequests()
      setSentRequests(sent)
      setReceivedRequests(received)
      setError('') // Clear any previous errors
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError('Failed to fetch requests')
      setSentRequests([])
      setReceivedRequests([])
    }
  }, [])

  // Search users
  const searchUsers = useCallback(async (query: string): Promise<SearchUser[]> => {
    if (query.trim().length < 2) return []

    try {
      return await searchUsersService(query)
    } catch (err) {
      console.error('Error searching users:', err)
      throw new Error(err instanceof Error ? err.message : 'Search failed')
    }
  }, [])

  // Send friend request
  const sendFriendRequest = useCallback(async (receiverId: string) => {
    setLoading(true)
    try {
      const result = await sendFriendRequestService(receiverId)
      
      if (result.success) {
        await fetchRequests() // Refresh requests
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to send request' }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to send request' 
      }
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    setLoading(true)
    try {
      const result = await acceptFriendRequestService(requestId)
      
      if (result.success) {
        await Promise.all([fetchRequests(), fetchFriends()]) // Refresh both
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to accept request' }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to accept request' 
      }
    } finally {
      setLoading(false)
    }
  }, [fetchRequests, fetchFriends])

  // Decline friend request
  const declineFriendRequest = useCallback(async (requestId: string) => {
    setLoading(true)
    try {
      const result = await declineFriendRequestService(requestId)
      
      if (result.success) {
        await fetchRequests() // Refresh requests
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to decline request' }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to decline request' 
      }
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  // Remove friend
  const removeFriend = useCallback(async (friendshipId: string) => {
    setLoading(true)
    try {
      const result = await removeFriendService(friendshipId)
      
      if (result.success) {
        await fetchFriends() // Refresh friends
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to remove friend' }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to remove friend' 
      }
    } finally {
      setLoading(false)
    }
  }, [fetchFriends])

  // Initial data load
  useEffect(() => {
    fetchFriends()
    fetchRequests()
  }, [fetchFriends, fetchRequests])

  return {
    // Data
    friends,
    sentRequests,
    receivedRequests,
    loading,
    error,
    
    // Actions
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    
    // Refresh functions
    refreshFriends: fetchFriends,
    refreshRequests: fetchRequests
  }
}