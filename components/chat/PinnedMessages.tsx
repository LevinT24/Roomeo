"use client"

import { useState } from "react"
import type { PinnedMessage } from "@/types/enhanced-chat"

interface PinnedMessagesProps {
  pinnedMessages: PinnedMessage[]
  currentUserId: string
  onUnpin: (messageId: string) => Promise<void>
  onMessageClick?: (messageId: string) => void
}

export default function PinnedMessages({ 
  pinnedMessages, 
  currentUserId, 
  onUnpin, 
  onMessageClick 
}: PinnedMessagesProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [unpinningId, setUnpinningId] = useState<string | null>(null)

  if (!pinnedMessages || pinnedMessages.length === 0) return null

  const handleUnpin = async (messageId: string) => {
    if (unpinningId) return
    
    setUnpinningId(messageId)
    try {
      await onUnpin(messageId)
    } catch (error) {
      console.error('Error unpinning message:', error)
    } finally {
      setUnpinningId(null)
    }
  }

  return (
    <div className="bg-moss-green/10 border-l-4 border-moss-green rounded-r-xl mb-4">
      <div className="flex items-center justify-between p-3 border-b border-moss-green/20">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-moss-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="roomeo-heading text-sm text-emerald-primary">
            📌 Pinned Messages ({pinnedMessages.length})
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sage hover:text-emerald-primary transition-colors"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3 max-h-48 overflow-y-auto">
          {pinnedMessages.map((pinned) => (
            <div 
              key={pinned.id}
              className="bg-white rounded-lg p-3 border border-sage/20 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => onMessageClick?.(pinned.message_id)}
                >
                  <p className="roomeo-body text-emerald-primary text-sm line-clamp-2">
                    {pinned.message?.content || 'Message content not available'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-sage">
                    <span>📌 by {pinned.pinned_by_user?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{new Date(pinned.pinned_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {(pinned.pinned_by === currentUserId || pinned.message?.sender_id === currentUserId) && (
                  <button
                    onClick={() => handleUnpin(pinned.message_id)}
                    disabled={unpinningId === pinned.message_id}
                    className="text-sage hover:text-alert-red transition-colors disabled:opacity-50"
                    title="Unpin message"
                  >
                    {unpinningId === pinned.message_id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-sage/30 border-t-alert-red"></div>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}