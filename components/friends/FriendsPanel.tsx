// components/friends/FriendsPanel.tsx
"use client"

import { useState, useEffect } from 'react'
import { X, Users, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import UserSearch from './UserSearch'
import FriendsList from './FriendsList'
import PendingRequests from './PendingRequests'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { User } from '@/types/user'

interface FriendsPanelProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onStartChat?: (friendId: string, friendName: string) => void
}

type ActiveView = 'friends' | 'search' | 'requests'

export default function FriendsPanel({ isOpen, onClose, user, onStartChat }: FriendsPanelProps) {
  const [activeView, setActiveView] = useState<ActiveView>('friends')
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Fetch pending requests count
  useEffect(() => {
    if (isOpen) {
      fetchPendingCount()
    }
  }, [isOpen])

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/friends/requests')
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.receivedRequests?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching pending count:', error)
    }
  }

  const handleRequestUpdate = () => {
    fetchPendingCount()
    // Refresh friends list if we're on that view
    if (activeView === 'friends') {
      setActiveView('friends') // This will trigger a re-render
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[#F2F5F1] border-l-4 border-[#004D40] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#004D40] px-4 py-3 flex items-center justify-between border-b-4 border-[#44C76F]">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-[#44C76F]" />
          <h2 className="font-black text-lg text-[#F2F5F1]">FRIENDS</h2>
          {pendingCount > 0 && (
            <div className="w-6 h-6 bg-[#44C76F] border-2 border-[#F2F5F1] rounded-full flex items-center justify-center">
              <span className="text-xs font-black text-[#004D40]">{pendingCount}</span>
            </div>
          )}
        </div>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className="border-2 border-[#F2F5F1] text-[#F2F5F1] hover:bg-[#F2F5F1] hover:text-[#004D40] bg-transparent"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#44C76F] px-4 py-2 flex space-x-1">
        {[
          { key: 'friends' as const, label: 'FRIENDS', icon: Users },
          { key: 'search' as const, label: 'SEARCH', icon: Search },
          { key: 'requests' as const, label: 'REQUESTS', icon: UserPlus, badge: pendingCount > 0 ? pendingCount : undefined }
        ].map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex-1 py-2 px-3 font-black text-xs rounded transition-colors relative ${
              activeView === key 
                ? 'bg-[#F2F5F1] text-[#004D40] shadow-[2px_2px_0px_0px_#004D40]' 
                : 'text-[#004D40] hover:bg-[#F2F5F1]/20'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </div>
            {badge && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border border-[#F2F5F1] rounded-full flex items-center justify-center">
                <span className="text-xs font-black text-white">{badge}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!loading && activeView === 'friends' && (
          <FriendsList user={user} onRequestUpdate={handleRequestUpdate} onStartChat={onStartChat} />
        )}

        {!loading && activeView === 'search' && (
          <UserSearch user={user} onRequestUpdate={handleRequestUpdate} />
        )}

        {!loading && activeView === 'requests' && (
          <PendingRequests user={user} onRequestUpdate={handleRequestUpdate} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#44C76F] px-4 py-2 border-t-2 border-[#004D40]">
        <p className="text-xs font-bold text-[#004D40] text-center">
          Connect with your roommates and build your network!
        </p>
      </div>
    </div>
  )
}