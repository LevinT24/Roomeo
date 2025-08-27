// ==========================================
// 5. UPDATE: components/friends/UserCard.tsx
// ==========================================

"use client"

import { useState } from 'react'
import Image from 'next/image'
import { UserPlus, Check, X, MessageCircle, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from '@/services/friends'
import { authAPI } from '@/lib/api'
import type { User } from '@/types/user'

interface UserCardProps {
  user: {
    id: string
    name: string
    profilePicture: string | null
    location?: string | null
  }
  currentUser: User
  relationshipStatus: 'stranger' | 'friend' | 'request_sent' | 'request_received'
  onActionComplete: () => void
  showLocation?: boolean
  showRemoveOption?: boolean
  friendshipId?: string
}

export default function UserCard({ 
  user, 
  currentUser, 
  relationshipStatus, 
  onActionComplete,
  showLocation = false,
  showRemoveOption = false,
  friendshipId
}: UserCardProps) {
  const [loading, setLoading] = useState(false)
  const [localStatus, setLocalStatus] = useState(relationshipStatus)

  const handleSendRequest = async () => {
    setLoading(true)
    try {
      const result = await sendFriendRequest(user.id)

      if (result.success) {
        setLocalStatus('request_sent')
        onActionComplete()
      } else {
        console.error('Failed to send friend request:', result.error)
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setLoading(true)
    try {
      const result = await acceptFriendRequest(requestId)

      if (result.success) {
        setLocalStatus('friend')
        onActionComplete()
      } else {
        console.error('Failed to accept friend request:', result.error)
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    setLoading(true)
    try {
      const result = await declineFriendRequest(requestId)

      if (result.success) {
        setLocalStatus('stranger')
        onActionComplete()
      } else {
        console.error('Failed to decline friend request:', result.error)
      }
    } catch (error) {
      console.error('Error declining friend request:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!friendshipId) return
    
    setLoading(true)
    try {
      const result = await removeFriend(friendshipId)

      if (result.success) {
        onActionComplete()
      } else {
        console.error('Failed to remove friend:', result.error)
      }
    } catch (error) {
      console.error('Error removing friend:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderActionButton = () => {
    if (loading) {
      return (
        <Button 
          disabled 
          size="sm"
          className="bg-gray-400 text-white font-bold px-3 py-1 text-xs"
        >
          Loading...
        </Button>
      )
    }

    switch (localStatus) {
      case 'stranger':
        return (
          <Button
            onClick={handleSendRequest}
            size="sm"
            className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] px-3 py-1 text-xs"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            ADD
          </Button>
        )

      case 'request_sent':
        return (
          <Button
            disabled
            size="sm"
            className="bg-gray-400 text-white font-bold px-3 py-1 text-xs cursor-not-allowed"
          >
            <Clock className="w-3 h-3 mr-1" />
            PENDING
          </Button>
        )

      case 'friend':
        return (
          <div className="flex space-x-1">
            <Button
              size="sm"
              className="bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black px-3 py-1 text-xs"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              CHAT
            </Button>
            {showRemoveOption && (
              <Button
                onClick={handleRemoveFriend}
                size="sm"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold px-2 py-1 text-xs"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] bg-white">
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          {/* Profile Picture */}
          <div className="w-12 h-12 bg-[#44C76F] border-2 border-[#004D40] rounded-lg flex items-center justify-center overflow-hidden">
            {user.profilePicture ? (
              <Image 
                src={user.profilePicture} 
                alt={user.name}
                className="w-full h-full object-cover"
                width={48}
                height={48}
              />
            ) : (
              <span className="text-[#004D40] font-black text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-sm text-[#004D40] truncate">
              {user.name}
            </h3>
            {showLocation && user.location && (
              <p className="text-xs text-[#004D40]/60 font-bold truncate">
                📍 {user.location}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            {renderActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
