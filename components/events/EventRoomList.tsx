// components/events/EventRoomList.tsx
// Center column showing list of rooms in collapsed view

"use client"

import { ExpenseSummary } from "@/types/expenses"

interface EventRoomListProps {
  rooms: ExpenseSummary[]
  onRoomClick: (roomId: string) => void
  onCreateRoom: () => void
  isLoading?: boolean
  emptyMessage?: string
}

export default function EventRoomList({
  rooms,
  onRoomClick,
  onCreateRoom,
  isLoading = false,
  emptyMessage = "No rooms yet"
}: EventRoomListProps) {
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="roomeo-heading text-2xl text-emerald-primary">🏠 Rooms</h2>
        </div>
        
        {/* Loading skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="roomeo-card p-4 animate-pulse">
              <div className="h-5 bg-sage/20 rounded mb-2"></div>
              <div className="h-4 bg-sage/20 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header - More compact */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="roomeo-heading text-xl text-emerald-primary">
          🏠 Rooms ({rooms.length})
        </h2>
        
        {/* Filter buttons - More compact */}
        <div className="flex gap-1">
          <button className="text-xs px-2 py-1 rounded-full bg-emerald-primary text-gold-accent">
            All
          </button>
          <button className="text-xs px-2 py-1 rounded-full bg-sage/20 text-emerald-primary hover:bg-sage/30 transition-colors">
            Active
          </button>
          <button className="text-xs px-2 py-1 rounded-full bg-sage/20 text-emerald-primary hover:bg-sage/30 transition-colors">
            Settled
          </button>
        </div>
      </div>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <div className="roomeo-card text-center py-8">
          <div className="text-3xl mb-3 opacity-50">🏠</div>
          <h3 className="roomeo-heading text-lg text-emerald-primary mb-2">{emptyMessage}</h3>
          <p className="roomeo-body text-emerald-primary/60 mb-4 text-sm">
            Create your first room to start tracking expenses for this event
          </p>
          <button
            onClick={onCreateRoom}
            className="roomeo-button-primary text-sm py-2 px-4"
          >
            ➕ Create Your First Room
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room, index) => (
            <div
              key={room.group_id}
              className="roomeo-card hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => onRoomClick(room.group_id)}
            >
              <div className="p-3">
                {/* Room Header - Compact */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="roomeo-heading text-base text-emerald-primary group-hover:text-emerald-primary/80 transition-colors truncate">
                      {room.group_name}
                    </h3>
                    {room.group_description && (
                      <p className="roomeo-body text-emerald-primary/60 text-xs mt-0.5 truncate">
                        {room.group_description}
                      </p>
                    )}
                  </div>
                  
                  {/* Status indicator - smaller */}
                  <div className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                    room.is_settled 
                      ? 'bg-roomeo-success/20 text-roomeo-success' 
                      : 'bg-gold-accent/20 text-gold-accent'
                  }`}>
                    {room.is_settled ? '✅' : '💰'}
                  </div>
                </div>

                {/* Room Stats - Horizontal layout */}
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="font-bold text-emerald-primary">${room.total_amount.toFixed(0)}</div>
                      <div className="text-xs text-emerald-primary/60">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-emerald-primary">{room.participants?.length || 0}</div>
                      <div className="text-xs text-emerald-primary/60">Members</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold ${
                        room.pending_settlements_count && room.pending_settlements_count > 0
                          ? 'text-gold-accent'
                          : 'text-emerald-primary'
                      }`}>
                        {room.pending_settlements_count || 0}
                      </div>
                      <div className="text-xs text-emerald-primary/60">Pending</div>
                    </div>
                  </div>

                  {/* Your balance - inline */}
                  {!room.is_settled && (
                    <div className="text-xs text-emerald-primary/70 bg-sage/10 px-2 py-1 rounded">
                      You: <span className={`font-medium ${
                        (room.amount_owed - room.amount_paid) > 0 
                          ? 'text-alert-red' 
                          : 'text-roomeo-success'
                      }`}>
                        ${Math.abs(room.amount_owed - room.amount_paid).toFixed(2)}
                        {(room.amount_owed - room.amount_paid) > 0 ? ' owed' : ' settled'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Click hint - minimal */}
                <div className="text-center">
                  <p className="text-xs text-emerald-primary/30 group-hover:text-emerald-primary/50 transition-colors">
                    Click to view details →
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Room Button - More compact */}
          <button
            onClick={onCreateRoom}
            className="w-full border-2 border-dashed border-sage/30 hover:border-emerald-primary/50 hover:bg-sage/10 transition-all p-3 rounded-xl text-center group"
          >
            <div className="text-emerald-primary/50 group-hover:text-emerald-primary transition-colors">
              <div className="text-lg mb-1">➕</div>
              <p className="roomeo-body font-medium text-sm">Add Another Room</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}