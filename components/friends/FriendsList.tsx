// ==========================================
// 2. UPDATE: components/friends/FriendsList.tsx
// ==========================================

"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Users, UserX, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getFriendsList, removeFriend } from '@/services/friends'
import type { User } from '@/types/user'

interface FriendsListProps {
  user: User
  onRequestUpdate: () => void
}

interface Friend {
  id: string
  friendId: string
  name: string
  profilePicture: string | null
  friendsSince: string
}

export default function FriendsList({ user, onRequestUpdate }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFriends()
  }, [])

  const fetchFriends = async () => {
    setLoading(true)
    setError('')
    
    try {
      const friendsList = await getFriendsList()
      setFriends(friendsList)
    } catch (err) {
      console.error('Error fetching friends:', err)
      setError(err instanceof Error ? err.message : 'Failed to load friends list')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      const result = await removeFriend(friendshipId)

      if (result.success) {
        await fetchFriends()
        onRequestUpdate()
      } else {
        console.error('Failed to remove friend:', result.error)
        setError(result.error || 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      setError('Failed to remove friend')
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartChat = (friendId: string, friendName: string) => {
    // TODO: Integrate with existing chat system
    console.log(`Starting chat with ${friendName} (${friendId})`)
  }

  const formatFriendsSince = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
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
        <UserX className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-black text-lg text-[#004D40] mb-2">ERROR</h3>
        <p className="text-red-600 font-bold text-sm mb-4">{error}</p>
        <Button
          onClick={fetchFriends}
          className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black"
        >
          TRY AGAIN
        </Button>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users className="w-12 h-12 text-[#004D40]/40 mx-auto mb-4" />
        <h3 className="font-black text-lg text-[#004D40] mb-2">NO FRIENDS YET</h3>
        <p className="text-[#004D40]/60 font-bold text-sm">
          Start building your network by searching for friends!
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-[#44C76F]" />
          <h3 className="font-black text-lg text-[#004D40]">
            YOUR FRIENDS ({friends.length})
          </h3>
        </div>

        <div className="space-y-3">
          {friends.map((friend) => (
            <Card key={friend.id} className="border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] bg-white">
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  {/* Profile Picture */}
                  <div className="w-12 h-12 bg-[#44C76F] border-2 border-[#004D40] rounded-lg flex items-center justify-center overflow-hidden">
                    {friend.profilePicture ? (
                      <Image 
                        src={friend.profilePicture} 
                        alt={friend.name}
                        className="w-full h-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <span className="text-[#004D40] font-black text-lg">
                        {friend.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Friend Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm text-[#004D40] truncate">
                      {friend.name}
                    </h4>
                    <p className="text-xs text-[#004D40]/60 font-bold">
                      Friends since {formatFriendsSince(friend.friendsSince)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleStartChat(friend.friendId, friend.name)}
                      size="sm"
                      className="bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black border-2 border-[#004D40] px-3 py-1 text-xs"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      CHAT
                    </Button>
                    
                    <Button
                      onClick={() => handleRemoveFriend(friend.id)}
                      disabled={actionLoading === friend.id}
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold px-2 py-1 text-xs"
                    >
                      {actionLoading === friend.id ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserX className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
