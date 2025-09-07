// components/events/EventsListPage.tsx
// Main events list page showing all user's events

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { EventListItem, CreateEventRequest } from "@/types/events"
import { getUserEvents, createEvent, deleteEvent } from "@/services/events"
import { useFriends } from "@/hooks/useFriends"

// Import components
import EventCard from "./EventCard"
import CreateEventModal from "./CreateEventModal"
import NotificationsDropdown from "../NotificationsDropdown"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

interface EventsListPageProps {
  user: User
  onEventClick?: (eventId: string) => void
}

export default function EventsListPage({ user, onEventClick }: EventsListPageProps) {
  const router = useRouter()
  const [events, setEvents] = useState<EventListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  const { friends } = useFriends()

  // Fetch user's events
  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const userEvents = await getUserEvents()
      setEvents(userEvents)
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  // Load events on mount
  useEffect(() => {
    fetchEvents()
  }, [])

  // Handle event creation
  const handleCreateEvent = async (data: CreateEventRequest) => {
    try {
      const result = await createEvent(data)
      if (result.success) {
        await fetchEvents() // Refresh list
        setIsCreateModalOpen(false)
      } else {
        throw new Error(result.message || 'Failed to create event')
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  // Handle event deletion with confirmation
  const handleDeleteEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.name}"?\n\n` +
      `This will permanently delete the event and all its rooms. ` +
      `Make sure all expenses are settled first.`
    )

    if (!confirmed) return

    try {
      setDeletingEventId(eventId)
      
      const result = await deleteEvent(eventId)
      if (result.success) {
        await fetchEvents() // Refresh list
      } else {
        throw new Error(result.message || 'Failed to delete event')
      }
    } catch (err) {
      console.error('Error deleting event:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setDeletingEventId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-mint-cream min-h-screen">
        <div className="px-6 py-6 lg:px-12 xl:px-20">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="animate-pulse">
              <div className="h-10 bg-sage/20 rounded mb-2 w-48"></div>
              <div className="h-4 bg-sage/20 rounded w-64"></div>
            </div>
            <div className="h-10 bg-sage/20 rounded w-32 animate-pulse"></div>
          </div>

          {/* Events grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="roomeo-card p-6 animate-pulse">
                <div className="h-6 bg-sage/20 rounded mb-4"></div>
                <div className="h-4 bg-sage/20 rounded mb-2"></div>
                <div className="h-4 bg-sage/20 rounded mb-4 w-3/4"></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-sage/20 rounded"></div>
                  <div className="h-16 bg-sage/20 rounded"></div>
                  <div className="h-16 bg-sage/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-mint-cream min-h-screen">
      <div className="px-6 py-6 lg:px-12 xl:px-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="animate-slide-up">
            <h1 className="roomeo-heading text-4xl mb-2">🎉 Events</h1>
            <p className="roomeo-body text-emerald-primary/70">
              Organize big trips and group expenses
            </p>
          </div>

          <div className="flex items-center gap-3 animate-slide-up">
            <NotificationsDropdown userId={user.id} />
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="roomeo-button-primary flex items-center gap-2"
            >
              <span>➕</span>
              <span>Create Event</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-5 bg-alert-red/10 border border-alert-red/20 rounded-xl text-alert-red animate-slide-up">
            <div className="flex items-center justify-between">
              <span className="roomeo-body font-medium">{error}</span>
              <button 
                onClick={() => setError('')}
                className="roomeo-interactive text-alert-red hover:no-underline ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="roomeo-card text-center py-16 animate-slide-up">
            <div className="text-6xl mb-6">🎉</div>
            <h3 className="roomeo-heading text-2xl mb-4">No events yet</h3>
            <p className="roomeo-body text-emerald-primary/60 mb-8 max-w-md mx-auto">
              Create your first event to start organizing group expenses for trips, 
              parties, or shared activities.
            </p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="roomeo-button-primary"
            >
              <span>🚀</span> Create Your First Event
            </button>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="roomeo-card p-6 animate-slide-up">
                <h3 className="roomeo-heading text-lg mb-2">📊 Total Events</h3>
                <div className="text-3xl font-bold text-emerald-primary">{events.length}</div>
              </div>
              <div className="roomeo-card p-6 animate-slide-up">
                <h3 className="roomeo-heading text-lg mb-2">🏠 Total Rooms</h3>
                <div className="text-3xl font-bold text-emerald-primary">
                  {events.reduce((sum, event) => sum + event.stats.room_count, 0)}
                </div>
              </div>
              <div className="roomeo-card p-6 animate-slide-up">
                <h3 className="roomeo-heading text-lg mb-2">💰 Total Amount</h3>
                <div className="text-3xl font-bold text-emerald-primary">
                  ${events.reduce((sum, event) => sum + event.stats.total_amount, 0).toFixed(0)}
                </div>
              </div>
              <div className="roomeo-card p-6 animate-slide-up">
                <h3 className="roomeo-heading text-lg mb-2">👑 You Own</h3>
                <div className="text-3xl font-bold text-emerald-primary">
                  {events.filter(event => event.role === 'owner').length}
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <div 
                  key={event.id} 
                  className="animate-on-scroll"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <EventCard
                    event={event}
                    onClick={onEventClick || ((eventId) => router.push(`/events/${eventId}`))}
                    onDelete={event.role === 'owner' ? handleDeleteEvent : undefined}
                    currentUserId={user.id}
                  />
                  
                  {/* Deleting overlay */}
                  {deletingEventId === event.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-alert-red/30 border-t-alert-red mx-auto mb-2"></div>
                        <p className="text-sm text-alert-red font-medium">Deleting...</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        friends={friends.map(f => ({
          id: f.friendId,
          name: f.name,
          profilePicture: f.profilePicture || undefined
        }))}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  )
}