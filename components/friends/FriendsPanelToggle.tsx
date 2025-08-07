// ==========================================
// 6. UPDATE: components/friends/FriendsPanelToggle.tsx
// ==========================================

"use client"

import { useState, useEffect } from 'react'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authAPI } from '@/lib/api'

interface FriendsPanelToggleProps {
  isOpen: boolean
  onToggle: () => void
  show: boolean // Whether to show the toggle based on current page
}

export default function FriendsPanelToggle({ isOpen, onToggle, show }: FriendsPanelToggleProps) {
  const [pendingCount, setPendingCount] = useState(0)

  // Fetch pending requests count
  useEffect(() => {
    if (show) {
      fetchPendingCount()
      // Set up periodic refresh
      const interval = setInterval(fetchPendingCount, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [show])

  const fetchPendingCount = async () => {
    try {
      const response = await authAPI.get('/api/friends/requests')
      if (response.ok) {
        const data = await response.json()
        setPendingCount(data.receivedRequests?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching pending count:', error)
    }
  }

  if (!show) return null

  return (
    <div className={`fixed top-1/2 transform -translate-y-1/2 z-40 transition-all duration-300 ${
      isOpen ? 'right-80' : 'right-0'
    }`}>
      <Button
        onClick={onToggle}
        className={`
          h-16 bg-[#44C76F] hover:bg-[#44C76F]/80 border-4 border-[#004D40] 
          text-[#004D40] font-black shadow-[4px_4px_0px_0px_#004D40] 
          hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] 
          transition-all relative
          ${isOpen ? 'rounded-l-lg px-3' : 'rounded-l-lg px-4'}
        `}
      >
        <div className="flex items-center space-x-2">
          {isOpen ? (
            <>
              <ChevronRight className="w-5 h-5" />
              <span className="text-sm">CLOSE</span>
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              <div className="flex flex-col items-center">
                <span className="text-sm leading-none">FRIENDS</span>
                {pendingCount > 0 && (
                  <span className="text-xs leading-none opacity-75">({pendingCount})</span>
                )}
              </div>
              <ChevronLeft className="w-5 h-5" />
            </>
          )}
        </div>

        {/* Notification Badge */}
        {!isOpen && pendingCount > 0 && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 border-2 border-[#F2F5F1] rounded-full flex items-center justify-center">
            <span className="text-xs font-black text-white">{Math.min(pendingCount, 9)}</span>
          </div>
        )}
      </Button>
    </div>
  )
}