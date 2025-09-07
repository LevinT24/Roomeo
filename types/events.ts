// types/events.ts - Event feature TypeScript types
// Reuses existing expense types where possible for consistency

import { ExpenseSummary } from './expenses'

// Core Event types
export interface Event {
  id: string
  name: string
  description?: string
  start_date?: string
  end_date?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface EventMember {
  id: string
  event_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  name: string
  profile_picture?: string
}

// Event with full details (includes members and rooms)
export interface EventWithDetails extends Event {
  members: EventMember[]
  rooms: ExpenseSummary[] // Reuse existing ExpenseSummary type
  stats: {
    total_rooms: number
    total_amount: number
    member_count: number
  }
}

// Event list item (for user's events list)
export interface EventListItem extends Event {
  role: 'owner' | 'member'
  stats: {
    room_count: number
    member_count: number
    total_amount: number
  }
}

// API Request/Response types
export interface CreateEventRequest {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  invited_member_ids?: string[]
}

export interface CreateEventResponse {
  event_id: string
  success: boolean
  message?: string
}

export interface UpdateEventRequest {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
}

export interface UpdateEventResponse {
  success: boolean
  message?: string
}

export interface AddEventMemberRequest {
  user_id: string
  role?: 'owner' | 'member'
}

export interface AddEventMemberResponse {
  success: boolean
  message?: string
}

export interface RemoveEventMemberRequest {
  user_id: string
}

export interface RemoveEventMemberResponse {
  success: boolean
  message?: string
}

// Enhanced CreateExpenseGroupRequest to support events
export interface CreateEventExpenseGroupRequest {
  name: string
  description?: string
  total_amount: number
  split_type: 'equal' | 'custom'
  participants: string[] // user IDs
  custom_amounts?: number[]
  event_id: string // Required for event rooms
}

// Component prop types
export interface EventCardProps {
  event: EventListItem
  onClick: (eventId: string) => void
  onEdit?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  currentUserId: string
}

export interface EventSidebarProps {
  event: EventWithDetails | null
  onCreateRoom: () => void
  onEditEvent: () => void
  onInviteMembers: () => void
  onDeleteEvent?: () => void
  currentUserId: string
}

export interface EventRoomListProps {
  rooms: ExpenseSummary[]
  onRoomClick: (roomId: string) => void
  onCreateRoom: () => void
  isLoading?: boolean
  emptyMessage?: string
}

export interface SlidingRoomPanelProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export interface EventRoomViewProps {
  roomId: string
  eventId: string
  eventName?: string
  user: {
    id: string
    name: string
    profilePicture?: string
  }
}

export interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  friends: Array<{
    id: string
    name: string
    profilePicture?: string
  }>
  onCreateEvent: (data: CreateEventRequest) => Promise<void>
}

export interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  onUpdateEvent: (data: UpdateEventRequest) => Promise<void>
}

export interface InviteEventMembersModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventWithDetails
  availableFriends: Array<{
    id: string
    name: string
    profilePicture?: string
  }>
  onInviteMembers: (userIds: string[]) => Promise<void>
}

// Error types
export interface EventError {
  code: string
  message: string
  details?: any
}

// Notification types for events
export interface EventNotificationData {
  event_id: string
  event_name: string
  room_id?: string
  room_name?: string
}

// Database function return types (matching SQL functions)
export interface EventDetailsResponse {
  event: Event
  members: EventMember[]
  rooms: Array<{
    group_id: string
    group_name: string
    description?: string
    total_amount: number
    status: string
    created_at: string
    created_by: string
    participant_count: number
  }>
  stats: {
    total_rooms: number
    total_amount: number
    member_count: number
  }
}

export interface UserEventsResponse {
  events: EventListItem[]
}

// Real-time subscription payload types
export interface EventChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Event
  old?: Event
}

export interface EventMemberChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: EventMember
  old?: EventMember
}