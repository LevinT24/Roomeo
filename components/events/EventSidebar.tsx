// components/events/EventSidebar.tsx
// Left sidebar with event info and actions

"use client"

import { EventWithDetails } from "@/types/events"
import { useState } from "react"
import SimplifiedDebtsModal from "./SimplifiedDebtsModal"
import EventAnalyticsModal from "./EventAnalyticsModal"

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
  const [isSimplifiedDebtsOpen, setIsSimplifiedDebtsOpen] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)
  
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

      {/* Event Balance Summary */}
      <div className="p-3 border-b border-sage/20">
        {(() => {
          // Calculate balance totals across all rooms in the event
          let youOwe = 0
          let youAreOwed = 0

          event.rooms.forEach(room => {
            // Find current user's participation in this room
            const currentUserParticipant = room.participants?.find(p => p.user_id === currentUserId)
            
            if (currentUserParticipant) {
              // Calculate what current user owes in this room
              const userOwes = Math.max(0, currentUserParticipant.amount_owed - currentUserParticipant.amount_paid)
              youOwe += userOwes
            }

            // If current user is the creator of this room, calculate what others owe them
            if (room.created_by_id === currentUserId && room.participants) {
              room.participants.forEach(participant => {
                if (participant.user_id !== currentUserId) {
                  const participantOwes = Math.max(0, participant.amount_owed - participant.amount_paid)
                  youAreOwed += participantOwes
                }
              })
            }
          })

          const netBalance = youAreOwed - youOwe

          return (
            <div className="bg-white/50 rounded-xl p-3 shadow-sm">
              <h3 className="roomeo-heading text-xs text-emerald-primary mb-2 text-center">
                💰 Your Balance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-alert-red/10 rounded-lg">
                  <p className="text-xs text-emerald-primary/60">You Owe</p>
                  <p className={`text-sm font-bold ${youOwe > 0 ? 'text-alert-red' : 'text-emerald-primary'}`}>
                    ${youOwe.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-roomeo-success/10 rounded-lg">
                  <p className="text-xs text-emerald-primary/60">You&apos;re Owed</p>
                  <p className={`text-sm font-bold ${youAreOwed > 0 ? 'text-roomeo-success' : 'text-emerald-primary'}`}>
                    ${youAreOwed.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-sage/10 rounded-lg">
                  <p className="text-xs text-emerald-primary/60">Net Balance</p>
                  <p className={`text-sm font-bold ${
                    netBalance > 0 ? 'text-roomeo-success' : 
                    netBalance < 0 ? 'text-alert-red' : 'text-emerald-primary'
                  }`}>
                    {netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )
        })()}
        
        {/* Simplify Debts Button */}
        <div className="mt-3">
          <button
            onClick={() => setIsSimplifiedDebtsOpen(true)}
            className="w-full roomeo-button-secondary flex items-center justify-center gap-2 text-xs py-2"
          >
            <span>🔄</span>
            <span>Simplify Debts</span>
          </button>
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

      {/* Analytics & Insights Button */}
      <div className="border-t border-sage/20 p-3">
        <button
          onClick={() => setIsAnalyticsModalOpen(true)}
          className="w-full roomeo-button-secondary flex items-center justify-center gap-2 text-sm py-3"
        >
          <span>📊</span>
          <span>Analytics & Insights</span>
        </button>
      </div>

      {/* Click away to close menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      
      {/* Simplified Debts Modal */}
      <SimplifiedDebtsModal
        isOpen={isSimplifiedDebtsOpen}
        onClose={() => setIsSimplifiedDebtsOpen(false)}
        event={event}
        currentUserId={currentUserId}
        onSettleNow={async (debts) => {
          // TODO: Implement settlement logic
          console.log('Settling debts:', debts)
        }}
      />

      {/* Analytics Modal */}
      <EventAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        event={event}
        currentUserId={currentUserId}
      />
    </div>
  )
}