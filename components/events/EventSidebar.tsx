// components/events/EventSidebar.tsx
// Left sidebar with event info and actions

"use client"

import { EventWithDetails } from "@/types/events"
import { useState } from "react"

interface EventSidebarProps {
  event: EventWithDetails | null
  onCreateRoom: () => void
  onEditEvent: () => void
  onInviteMembers: () => void
  onDeleteEvent?: () => void
  currentUserId: string
}

export default function EventSidebar({
  event,
  onCreateRoom,
  onEditEvent,
  onInviteMembers,
  onDeleteEvent,
  currentUserId
}: EventSidebarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  if (!event) {
    return (
      <div className="roomeo-card p-6 animate-pulse">
        <div className="h-6 bg-sage/20 rounded mb-4"></div>
        <div className="h-4 bg-sage/20 rounded mb-2"></div>
        <div className="h-4 bg-sage/20 rounded mb-4 w-3/4"></div>
        <div className="h-10 bg-sage/20 rounded"></div>
      </div>
    )
  }

  const isOwner = event.members.some(m => m.user_id === currentUserId && m.role === 'owner')
  
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return null
    
    const start = startDate ? new Date(startDate).toLocaleDateString() : null
    const end = endDate ? new Date(endDate).toLocaleDateString() : null
    
    if (start && end) return `${start} - ${end}`
    if (start) return `From ${start}`
    if (end) return `Until ${end}`
    return null
  }

  const dateRange = formatDateRange(event.start_date, event.end_date)

  return (
    <div className="h-full flex flex-col">
      {/* Event Header - Compact */}
      <div className="p-3 border-b border-sage/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="roomeo-heading text-lg text-emerald-primary truncate">{event.name}</h1>
            <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              isOwner 
                ? 'bg-emerald-primary text-gold-accent' 
                : 'bg-sage/20 text-emerald-primary'
            }`}>
              {isOwner ? '👑' : '👤'} {isOwner ? 'Owner' : 'Member'}
            </div>
          </div>
          
          {/* Menu Button (only for owners) */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 text-emerald-primary/50 hover:text-emerald-primary hover:bg-sage/20 rounded transition-all"
              >
                ⋮
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-sage/20 z-10">
                  <button
                    onClick={() => {
                      onEditEvent()
                      setIsMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-emerald-primary hover:bg-sage/10 rounded-t-lg transition-colors"
                  >
                    📝 Edit Event
                  </button>
                  {onDeleteEvent && (
                    <button
                      onClick={() => {
                        onDeleteEvent()
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-alert-red hover:bg-alert-red/10 rounded-b-lg transition-colors"
                    >
                      🗑️ Delete Event
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        {dateRange && (
          <div className="flex items-center gap-1 text-emerald-primary/60 mb-2">
            <span className="text-sm">📅</span>
            <span className="roomeo-body text-xs">{dateRange}</span>
          </div>
        )}

        {/* Stats - More compact */}
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center p-1.5 bg-sage/10 rounded">
            <div className="text-sm font-bold text-emerald-primary">{event.stats.total_rooms}</div>
            <div className="text-xs text-emerald-primary/60">Rooms</div>
          </div>
          <div className="text-center p-1.5 bg-sage/10 rounded">
            <div className="text-sm font-bold text-emerald-primary">{event.stats.member_count}</div>
            <div className="text-xs text-emerald-primary/60">Members</div>
          </div>
          <div className="text-center p-1.5 bg-sage/10 rounded">
            <div className="text-sm font-bold text-emerald-primary">
              ${event.stats.total_amount.toFixed(0)}
            </div>
            <div className="text-xs text-emerald-primary/60">Total</div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Compact */}
      <div className="p-3 border-b border-sage/20">
        <button
          onClick={onCreateRoom}
          className="w-full roomeo-button-primary flex items-center justify-center gap-2 text-sm py-2"
        >
          <span>➕</span>
          <span>Create Room</span>
        </button>
        
        {isOwner && (
          <button
            onClick={onInviteMembers}
            className="w-full roomeo-button-secondary flex items-center justify-center gap-2 text-sm py-2 mt-2"
          >
            <span>👥</span>
            <span>Invite Members</span>
          </button>
        )}
      </div>

      {/* Members List - Scrollable only */}
      <div className="flex-1 p-3 overflow-hidden">
        <h3 className="roomeo-heading text-sm text-emerald-primary mb-2">
          👥 Members ({event.members.length})
        </h3>
        
        <div className="space-y-1 h-full overflow-y-auto pr-2">
          {event.members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 p-2 rounded hover:bg-sage/10 transition-colors">
              <div
                className="w-6 h-6 rounded-full bg-sage/30 bg-cover bg-center flex-shrink-0"
                style={{
                  backgroundImage: member.profile_picture 
                    ? `url("${member.profile_picture}")` 
                    : undefined
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="roomeo-body text-sm font-medium text-emerald-primary truncate">
                  {member.name || 'Unknown User'}
                </p>
                <p className="text-xs text-emerald-primary/60">
                  {member.role === 'owner' ? '👑 Owner' : '👤 Member'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Click away to close menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  )
}