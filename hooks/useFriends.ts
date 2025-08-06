// hooks/useFriends.ts
import { useState, useEffect, useCallback } from 'react'

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

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    try {
      const response = await fetch('/api/friends')
      if (response.ok) {
        const data = await response.json()
        setFriends(data.friends || [])
      }
    } catch (err) {
      console.error('Error fetching friends:', err)
      setError('Failed to fetch friends')
    }
  }, [])

  // Fetch friend requests
  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/friends/requests')
      if (response.ok) {
        const data = await response.json()
        setSentRequests(data.sentRequests || [])
        setReceivedRequests(data.receivedRequests || [])
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError('Failed to fetch requests')
    }
  }, [])

  // Search users
  const searchUsers = useCallback(async (query: string): Promise<SearchUser[]> => {
    if (query.trim().length < 2) return []

    try {
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query.trim())}`)
      if (response.ok) {
        const data = await response.json()
        return data.users || []
      }
      return []
    } catch (err) {
      console.error('Error searching users:', err)
      throw new Error('Search failed')
    }
  }, [])

  // Send friend request
  const sendFriendRequest = useCallback(async (receiverId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId })
      })

      if (response.ok) {
        await fetchRequests()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to send request' }
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      })

      if (response.ok) {
        await Promise.all([fetchRequests(), fetchFriends()])
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to accept request' }
    } finally {
      setLoading(false)
    }
  }, [fetchRequests, fetchFriends])

  // Decline friend request
  const declineFriendRequest = useCallback(async (requestId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      })

      if (response.ok) {
        await fetchRequests()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to decline request' }
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  // Remove friend
  const removeFriend = useCallback(async (friendshipId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchFriends()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (err) {
      return { success: false, error: 'Failed to remove friend' }
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