"use client"

import { useState, useEffect } from "react"
import { EventWithDetails, CreateEventExpenseGroupRequest } from "@/types/events"
import { ExpenseSummary, CreateExpenseGroupRequest } from "@/types/expenses"
import { getEventDetails, createEventExpenseGroup, addEventMember } from "@/services/events"
import { createExpenseGroup } from "@/services/expenses"
import { useFriends } from "@/hooks/useFriends"

// Import event components
import EventSidebar from "./EventSidebar"
import EventRoomList from "./EventRoomList"
import SlidingRoomPanel from "./SlidingRoomPanel"
import EventRoomView from "./EventRoomView"
import CreateExpenseModal from "../expenses/CreateExpenseModal"
import InviteEventMembersModal from "./InviteEventMembersModal"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  eventId: string
}

export default function EventModal({ isOpen, onClose, user, eventId }: EventModalProps) {
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal states
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false)
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

  // Load event data when modal opens
  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventData()
    }
  }, [isOpen, eventId])

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

  // Close panel
  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedRoomId(null)
  }

  // Handle invite members
  const handleInviteMembers = async (userIds: string[]) => {
    try {
      // Add each selected user to the event
      const invitePromises = userIds.map(userId =>
        addEventMember(eventId, { user_id: userId, role: 'member' })
      )
      
      const results = await Promise.all(invitePromises)
      
      // Check if any invitations failed
      const failedInvites = results.filter(result => !result.success)
      if (failedInvites.length > 0) {
        throw new Error(`Failed to invite ${failedInvites.length} member(s)`)
      }
      
      // Refresh event data to show new members
      await fetchEventData()
      setIsInviteMembersModalOpen(false)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to invite members')
    }
  }

  // Handle modal close
  const handleClose = () => {
    setIsPanelOpen(false)
    setSelectedRoomId(null)
    setIsInviteMembersModalOpen(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 lg:p-4">
      <div className="bg-mint-cream rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-fade-in shadow-2xl">
        
        {/* Modal Header - Compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sage/20 flex-shrink-0">
          <div>
            <h1 className="roomeo-heading text-xl lg:text-2xl text-emerald-primary">
              {event?.name || 'Event'}
            </h1>
            <p className="text-xs lg:text-sm text-emerald-primary/60">
              Event Dashboard
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-emerald-primary/70 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Content - Single scroll area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center animate-fade-in">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
                <p className="roomeo-body text-emerald-primary/70 text-lg">Loading event... 🎉</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-6 opacity-50">⚠️</div>
                <h2 className="roomeo-heading text-2xl text-emerald-primary mb-4">Failed to Load Event</h2>
                <p className="roomeo-body text-emerald-primary/70 mb-8">{error}</p>
                <button
                  onClick={fetchEventData}
                  className="roomeo-button-primary"
                >
                  🔄 Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex">
              {/* Left Sidebar - Event Info - Fixed width, internal scroll only for members */}
              <div className="w-72 flex-shrink-0 border-r border-sage/20 bg-sage/5">
                <EventSidebar
                  event={event}
                  onCreateRoom={() => setIsCreateRoomModalOpen(true)}
                  onEditEvent={() => {}} // TODO: Implement if needed
                  onInviteMembers={() => setIsInviteMembersModalOpen(true)}
                  onDeleteEvent={() => {}} // TODO: Implement if needed
                  currentUserId={user.id}
                />
              </div>

              {/* Main Content Area - Single scroll for rooms */}
              <div className={`flex-1 transition-all duration-300 ${
                isPanelOpen ? 'lg:mr-0' : ''
              } overflow-y-auto`}>
                <div className="p-4">
                  <EventRoomList
                    rooms={event?.rooms || []}
                    onRoomClick={handleRoomClick}
                    onCreateRoom={() => setIsCreateRoomModalOpen(true)}
                    isLoading={isLoading}
                    emptyMessage="No rooms yet in this event"
                  />
                </div>
              </div>

              {/* Right Panel - Room Details (Sliding) */}
              <div className={`transition-all duration-300 ${
                isPanelOpen ? 'w-96 flex-shrink-0' : 'w-0'
              } ${isPanelOpen ? 'border-l border-sage/20 bg-white/50' : ''} ${isPanelOpen ? 'overflow-y-auto' : 'overflow-hidden'}`}>
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
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal - with event context */}
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

      {/* Invite Members Modal */}
      {event && (
        <InviteEventMembersModal
          isOpen={isInviteMembersModalOpen}
          onClose={() => setIsInviteMembersModalOpen(false)}
          event={event}
          availableFriends={friends.map(f => ({
            id: f.friendId,
            name: f.name,
            profilePicture: f.profilePicture || undefined
          }))}
          onInviteMembers={handleInviteMembers}
        />
      )}
    </div>
  )
}