// components/events/EventCard.tsx
// Simple event card for events list - follows existing ExpenseCard patterns

"use client"

import { EventListItem } from "@/types/events"
import { useState } from "react"

interface EventCardProps {
  event: EventListItem
  onClick: (eventId: string) => void
  onEdit?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  currentUserId: string
}

export default function EventCard({ 
  event, 
  onClick, 
  onEdit, 
  onDelete, 
  currentUserId 
}: EventCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isOwner = event.user_role === 'owner'

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
    <div className="roomeo-card hover:shadow-lg transition-all duration-300 cursor-pointer group">
      <div 
        className="p-6"
        onClick={() => onClick(event.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="roomeo-heading text-xl text-emerald-primary">{event.name}</h3>
              <div className={`text-xs px-2 py-1 rounded-full ${
                isOwner 
                  ? 'bg-emerald-primary text-gold-accent' 
                  : 'bg-sage/20 text-emerald-primary'
              }`}>
                {isOwner ? '👑 Owner' : '👤 Member'}
              </div>
            </div>
            
            {event.description && (
              <p className="roomeo-body text-emerald-primary/70 text-sm mb-2">
                {event.description}
              </p>
            )}
            
            {dateRange && (
              <p className="roomeo-body text-emerald-primary/60 text-xs mb-3">
                📅 {dateRange}
              </p>
            )}
          </div>

          {/* Menu Button (only for owners) */}
          {isOwner && (onEdit || onDelete) && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMenuOpen(!isMenuOpen)
                }}
                className="p-2 text-emerald-primary/50 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                ⋮
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-sage/20 z-10">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(event.id)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-3 text-emerald-primary hover:bg-sage/10 rounded-t-xl transition-colors"
                    >
                      📝 Edit Event
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(event.id)
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-3 text-alert-red hover:bg-alert-red/10 rounded-b-xl transition-colors"
                    >
                      🗑️ Delete Event
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-sage/10 rounded-lg">
            <div className="text-lg font-bold text-emerald-primary">{event.rooms_count || 0}</div>
            <div className="text-xs text-emerald-primary/60">🏠 Rooms</div>
          </div>
          <div className="text-center p-3 bg-sage/10 rounded-lg">
            <div className="text-lg font-bold text-emerald-primary">{event.member_count || 0}</div>
            <div className="text-xs text-emerald-primary/60">👥 Members</div>
          </div>
          <div className="text-center p-3 bg-sage/10 rounded-lg">
            <div className="text-lg font-bold text-emerald-primary">
              ${(event.total_amount || 0).toFixed(0)}
            </div>
            <div className="text-xs text-emerald-primary/60">💰 Total</div>
          </div>
        </div>

        {/* Quick Action Hint */}
        <div className="text-center pt-3 border-t border-sage/20">
          <p className="text-xs text-emerald-primary/50 group-hover:text-emerald-primary/70 transition-colors">
            Click to view rooms and manage expenses →
          </p>
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