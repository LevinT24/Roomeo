// components/events/EventPage.tsx
// Main event page that orchestrates the three-column layout with sliding panel

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { EventWithDetails, CreateEventRequest, CreateEventExpenseGroupRequest } from "@/types/events"
import { ExpenseSummary, CreateExpenseGroupRequest } from "@/types/expenses"
import { getEventDetails, createEventExpenseGroup } from "@/services/events"
import { createExpenseGroup } from "@/services/expenses"
import { useFriends } from "@/hooks/useFriends"

// Import event components
import EventSidebar from "./EventSidebar"
import EventRoomList from "./EventRoomList"
import SlidingRoomPanel from "./SlidingRoomPanel"
import EventRoomView from "./EventRoomView"
import CreateExpenseModal from "../expenses/CreateExpenseModal"
import CreateEventModal from "./CreateEventModal"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

interface EventPageProps {
  user: User
  eventId: string
  onNavigateBack?: () => void
}

export default function EventPage({ user, eventId, onNavigateBack }: EventPageProps) {
  const router = useRouter()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal states
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false)
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false)
  const [isInviteMembersModalOpen, setIsInviteMembersModalOpen] = useState(false)

  const { friends } = useFriends()

  // Fetch event details
  const fetchEventData = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const eventDetails = await getEventDetails(eventId)
      if (!eventDetails) {
        throw new Error('Event not found')
      }
      
      setEvent(eventDetails)
    } catch (err) {
      console.error('Error fetching event data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setIsLoading(false)
    }
  }

  // Load event data on mount
  useEffect(() => {
    if (eventId) {
      fetchEventData()
    }
  }, [eventId])

  // Handle room click - opens sliding panel
  const handleRoomClick = (roomId: string) => {
    setSelectedRoomId(roomId)
    setIsPanelOpen(true)
  }

  // Handle room creation in event context
  const handleCreateRoom = async (data: CreateExpenseGroupRequest) => {
    try {
      // Use enhanced expense group creation with event context
      const result = await createExpenseGroup({
        ...data,
        event_id: eventId // Add event context
      })
      
      if (result.success) {
        // Refresh event data to show new room
        await fetchEventData()
        setIsCreateRoomModalOpen(false)
      } else {
        throw new Error(result.message || 'Failed to create room')
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  // Handle edit event
  const handleEditEvent = () => {
    setIsEditEventModalOpen(true)
  }

  // Handle invite members
  const handleInviteMembers = () => {
    setIsInviteMembersModalOpen(true)
  }

  // Handle delete event (placeholder for now)
  const handleDeleteEvent = () => {
    // TODO: Implement delete event functionality
    console.log('Delete event:', eventId)
  }

  // Close panel
  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedRoomId(null)
  }

  if (isLoading) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
          <p className="roomeo-body text-emerald-primary/70 text-lg">Loading event... 🎉</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 opacity-50">⚠️</div>
          <h2 className="roomeo-heading text-2xl text-emerald-primary mb-4">Failed to Load Event</h2>
          <p className="roomeo-body text-emerald-primary/70 mb-8">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={fetchEventData}
              className="roomeo-button-primary"
            >
              🔄 Try Again
            </button>
            {onNavigateBack && (
              <button
                onClick={onNavigateBack}
                className="roomeo-button-secondary"
              >
                ← Back to Events
              </button>
            )}
            {!onNavigateBack && (
              <button
                onClick={() => router.push('/events')}
                className="roomeo-button-secondary"
              >
                ← Back to Events
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-mint-cream min-h-screen">
      {/* Header with back navigation */}
      <div className="sticky top-0 z-30 bg-mint-cream/90 backdrop-blur-sm border-b border-sage/20 p-4">
        <div className="flex items-center gap-4">
          {onNavigateBack ? (
            <button
              onClick={onNavigateBack}
              className="p-2 text-emerald-primary/70 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
            >
              ←
            </button>
          ) : (
            <button
              onClick={() => router.push('/events')}
              className="p-2 text-emerald-primary/70 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="roomeo-heading text-xl text-emerald-primary">
              {event?.name || 'Event'}
            </h1>
            <p className="text-sm text-emerald-primary/60">
              Event Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="relative flex size-full min-h-[calc(100vh-80px)]">
        <div className="layout-container flex h-full grow">
          <main className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar - Event Info */}
            <div className="w-80 flex-shrink-0 p-6 overflow-y-auto">
              <EventSidebar
                event={event}
                onCreateRoom={() => setIsCreateRoomModalOpen(true)}
                onEditEvent={handleEditEvent}
                onInviteMembers={handleInviteMembers}
                onDeleteEvent={handleDeleteEvent}
                currentUserId={user.id}
              />
            </div>

            {/* Center Column - Room List */}
            <div className={`flex-1 p-6 overflow-y-auto transition-all duration-300 ${
              isPanelOpen ? 'lg:pr-3' : 'pr-6'
            }`}>
              <EventRoomList
                rooms={event?.rooms || []}
                onRoomClick={handleRoomClick}
                onCreateRoom={() => setIsCreateRoomModalOpen(true)}
                isLoading={isLoading}
                emptyMessage="No rooms yet in this event"
              />
            </div>

            {/* Right Panel - Room Details (Sliding) */}
            <div className={`transition-all duration-300 ${
              isPanelOpen ? 'w-2/5 flex-shrink-0' : 'w-0'
            } overflow-hidden`}>
              <SlidingRoomPanel
                isOpen={isPanelOpen}
                onClose={handleClosePanel}
              >
                {selectedRoomId && event && (
                  <EventRoomView
                    roomId={selectedRoomId}
                    eventId={eventId}
                    eventName={event.name}
                    user={user}
                  />
                )}
              </SlidingRoomPanel>
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      
      {/* Create Room Modal - reuses existing CreateExpenseModal */}
      <CreateExpenseModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        friends={friends.map(f => ({
          id: f.friendId,
          name: f.name,
          profilePicture: f.profilePicture || undefined
        }))}
        onCreateExpense={handleCreateRoom}
      />

      {/* TODO: Add other modals */}
      {/* Edit Event Modal */}
      {/* Invite Members Modal */}
    </div>
  )
}