// ==========================================
// 3. UPDATE: components/friends/PendingRequests.tsx
// ==========================================

"use client"

import { useState, useEffect } from 'react'
import { Check, X, Clock, Send, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getFriendRequests, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from '@/services/friends'
import type { User } from '@/types/user'

interface PendingRequestsProps {
  user: User
  onRequestUpdate: () => void
}

interface FriendRequest {
  id: string
  type: 'sent' | 'received'
  userId: string
  name: string
  profilePicture: string | null
  createdAt: string
}

export default function PendingRequests({ user, onRequestUpdate }: PendingRequestsProps) {
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { sent, received } = await getFriendRequests()
      
      setSentRequests(sent)
      setReceivedRequests(received)
    } catch (err) {
      console.error('Error fetching friend requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load friend requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const result = await acceptFriendRequest(requestId)

      if (result.success) {
        await fetchRequests()
        onRequestUpdate()
      } else {
        console.error('Failed to accept request:', result.error)
        setError(result.error || 'Failed to accept request')
      }
    } catch (error) {
      console.error('Error accepting request:', error)
      setError('Failed to accept request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const result = await declineFriendRequest(requestId)

      if (result.success) {
        await fetchRequests()
        onRequestUpdate()
      } else {
        console.error('Failed to decline request:', result.error)
        setError(result.error || 'Failed to decline request')
      }
    } catch (error) {
      console.error('Error declining request:', error)
      setError('Failed to decline request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const result = await cancelFriendRequest(requestId)

      if (result.success) {
        await fetchRequests()
        onRequestUpdate()
      } else {
        console.error('Failed to cancel request:', result.error)
        setError(result.error || 'Failed to cancel request')
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      setError('Failed to cancel request')
    } finally {
      setActionLoading(null)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-black text-lg text-[#004D40] mb-2">ERROR</h3>
        <p className="text-red-600 font-bold text-sm mb-4">{error}</p>
        <Button
          onClick={fetchRequests}
          className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black"
        >
          TRY AGAIN
        </Button>
      </div>
    )
  }

  const totalRequests = sentRequests.length + receivedRequests.length

  if (totalRequests === 0) {
    return (
      <div className="p-6 text-center">
        <Clock className="w-12 h-12 text-[#004D40]/40 mx-auto mb-4" />
        <h3 className="font-black text-lg text-[#004D40] mb-2">NO PENDING REQUESTS</h3>
        <p className="text-[#004D40]/60 font-bold text-sm">
          You have no pending friend requests at this time.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Received Requests Section */}
      {receivedRequests.length > 0 && (
        <div className="p-4 border-b-2 border-[#004D40]/20">
          <div className="flex items-center space-x-2 mb-3">
            <Inbox className="w-4 h-4 text-[#44C76F]" />
            <h3 className="font-black text-sm text-[#004D40]">
              REQUESTS RECEIVED ({receivedRequests.length})
            </h3>
          </div>
          <div className="space-y-3">
            {receivedRequests.map((request) => (
              <Card key={request.id} className="border-2 border-[#44C76F] shadow-[2px_2px_0px_0px_#44C76F] bg-[#44C76F]/10">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    {/* Profile Picture */}
                    <div className="w-10 h-10 bg-[#44C76F] border-2 border-[#004D40] rounded-lg flex items-center justify-center overflow-hidden">
                      {request.profilePicture ? (
                        <img 
                          src={request.profilePicture} 
                          alt={request.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#004D40] font-black text-sm">
                          {request.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-[#004D40] truncate">
                        {request.name}
                      </h4>
                      <p className="text-xs text-[#004D40]/60 font-bold">
                        {formatTimeAgo(request.createdAt)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-1">
                      <Button
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={actionLoading === request.id}
                        size="sm"
                        className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] px-2 py-1"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDeclineRequest(request.id)}
                        disabled={actionLoading === request.id}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white font-black border-2 border-red-700 px-2 py-1"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests Section */}
      {sentRequests.length > 0 && (
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Send className="w-4 h-4 text-[#004D40]/60" />
            <h3 className="font-black text-sm text-[#004D40]">
              REQUESTS SENT ({sentRequests.length})
            </h3>
          </div>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <Card key={request.id} className="border-2 border-[#004D40]/30 shadow-[2px_2px_0px_0px_#004D40]/30 bg-gray-50">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    {/* Profile Picture */}
                    <div className="w-10 h-10 bg-gray-300 border-2 border-[#004D40] rounded-lg flex items-center justify-center overflow-hidden">
                      {request.profilePicture ? (
                        <img 
                          src={request.profilePicture} 
                          alt={request.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#004D40] font-black text-sm">
                          {request.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-[#004D40] truncate">
                        {request.name}
                      </h4>
                      <p className="text-xs text-[#004D40]/60 font-bold">
                        Sent {formatTimeAgo(request.createdAt)}
                      </p>
                    </div>

                    {/* Status & Cancel Button */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#004D40]/60">PENDING</span>
                      <Button
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={actionLoading === request.id}
                        size="sm"
                        variant="outline"
                        className="border-red-400 text-red-500 hover:bg-red-500 hover:text-white font-bold px-2 py-1"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
