// services/events.ts - Event management service
// Follows existing patterns from services/expenses.ts

import { supabase } from "@/lib/supabase"
import {
  CreateEventRequest,
  CreateEventResponse,
  UpdateEventRequest,
  UpdateEventResponse,
  AddEventMemberRequest,
  AddEventMemberResponse,
  RemoveEventMemberRequest,
  RemoveEventMemberResponse,
  EventWithDetails,
  EventListItem,
  EventDetailsResponse,
  CreateEventExpenseGroupRequest
} from "@/types/events"
import { CreateExpenseGroupResponse } from "@/types/expenses"

// Helper function to ensure user is authenticated
async function ensureAuthenticated() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Authentication required')
  }
  return user
}

// Create new event
export async function createEvent(
  data: CreateEventRequest
): Promise<CreateEventResponse> {
  try {
    console.log("🔄 Creating event:", data)

    // Ensure user is authenticated
    await ensureAuthenticated()

    // Validate inputs
    if (!data.name.trim()) {
      throw new Error("Event name is required")
    }

    // Validate dates if provided
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      if (endDate < startDate) {
        throw new Error("End date cannot be before start date")
      }
    }

    // Call database function to create event
    const { data: result, error } = await supabase.rpc('create_event', {
      p_name: data.name.trim(),
      p_description: data.description || null,
      p_start_date: data.start_date || null,
      p_end_date: data.end_date || null,
      p_member_ids: data.invited_member_ids || []
    })

    if (error) {
      console.error("❌ Error creating event:", error)
      throw new Error(error.message || "Failed to create event")
    }

    console.log("✅ Event created with ID:", result)

    return {
      event_id: result,
      success: true
    }
  } catch (error) {
    console.error("❌ Exception creating event:", error)
    return {
      event_id: '',
      success: false,
      message: error instanceof Error ? error.message : "Failed to create event"
    }
  }
}

export async function getEventDetails(eventId: string): Promise<EventWithDetails | null> {
  try {
    console.log("🔄 Fetching event details for:", eventId)

    // Ensure user is authenticated
    const user = await ensureAuthenticated()

    // Call database function to get event details
    const { data: result, error } = await supabase.rpc('get_event_details', {
      p_event_id: eventId
    })

    if (error) {
      console.error("❌ Error fetching event details:", error)
      throw new Error(error.message || "Failed to fetch event details")
    }

    if (!result) {
      return null
    }

    // Fetch participant data for each room
    const roomsWithParticipants = await Promise.all(
      (result.rooms || []).map(async (room: any) => {
        // Get participants for this room
        const { data: participants } = await supabase
          .from('expense_participants')
          .select(`
            user_id,
            amount_owed,
            amount_paid,
            is_settled,
            users!inner(name, profilepicture)
          `)
          .eq('group_id', room.group_id)

        return {
          group_id: room.group_id,
          group_name: room.group_name,
          group_description: room.description,
          total_amount: room.total_amount,
          amount_owed: 0, // Will be calculated based on current user
          amount_paid: 0,
          is_settled: room.status === 'settled',
          created_by_name: '',
          created_by_id: room.created_by,
          created_at: room.created_at,
          group_status: room.status,
          participants: (participants || []).map((p: any) => ({
            user_id: p.user_id,
            name: p.users.name,
            profile_picture: p.users.profilepicture,
            amount_owed: p.amount_owed,
            amount_paid: p.amount_paid,
            is_settled: p.is_settled,
            is_creator: p.user_id === room.created_by
          }))
        }
      })
    )

    // Transform database response to match our types
    const eventDetails: EventWithDetails = {
      ...result.event,
      members: result.members || [],
      rooms: roomsWithParticipants,
      stats: {
        ...result.stats,
        member_count: result.members?.length || 0
      }
    }

    console.log("✅ Event details retrieved with participants:", eventDetails)
    return eventDetails
  } catch (error) {
    console.error("❌ Exception fetching event details:", error)
    return null
  }
}

// Get user's events
export async function getUserEvents(): Promise<EventListItem[]> {
  try {
    console.log("🔄 Fetching user events")

    // Ensure user is authenticated
    const user = await ensureAuthenticated()

    // Call database function to get user events
    const { data: result, error } = await supabase.rpc('get_user_events', {
      p_user_id: user.id
    })

    if (error) {
      console.error("❌ Error fetching user events:", error)
      throw new Error(error.message || "Failed to fetch events")
    }

    const events: EventListItem[] = result || []
    console.log("✅ User events retrieved:", events.length, "events")
    return events
  } catch (error) {
    console.error("❌ Exception fetching user events:", error)
    return []
  }
}

// Update event details
export async function updateEvent(
  eventId: string,
  data: UpdateEventRequest
): Promise<UpdateEventResponse> {
  try {
    console.log("🔄 Updating event:", eventId, data)

    // Ensure user is authenticated
    await ensureAuthenticated()

    // Call database function to update event
    const { data: result, error } = await supabase.rpc('update_event', {
      p_event_id: eventId,
      p_name: data.name || null,
      p_description: data.description || null,
      p_start_date: data.start_date || null,
      p_end_date: data.end_date || null
    })

    if (error) {
      console.error("❌ Error updating event:", error)
      throw new Error(error.message || "Failed to update event")
    }

    console.log("✅ Event updated successfully")

    return {
      success: true
    }
  } catch (error) {
    console.error("❌ Exception updating event:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update event"
    }
  }
}

// Add member to event
export async function addEventMember(
  eventId: string,
  data: AddEventMemberRequest
): Promise<AddEventMemberResponse> {
  try {
    console.log("🔄 Adding member to event:", eventId, data)

    // Ensure user is authenticated
    await ensureAuthenticated()

    // Call database function to add member
    const { data: result, error } = await supabase.rpc('add_event_member', {
      p_event_id: eventId,
      p_user_id: data.user_id,
      p_role: data.role || 'member'
    })

    if (error) {
      console.error("❌ Error adding event member:", error)
      throw new Error(error.message || "Failed to add member to event")
    }

    console.log("✅ Member added to event successfully")

    return {
      success: true
    }
  } catch (error) {
    console.error("❌ Exception adding event member:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add member to event"
    }
  }
}

// Remove member from event
export async function removeEventMember(
  eventId: string,
  data: RemoveEventMemberRequest
): Promise<RemoveEventMemberResponse> {
  try {
    console.log("🔄 Removing member from event:", eventId, data)

    // Ensure user is authenticated
    await ensureAuthenticated()

    // Call database function to remove member
    const { data: result, error } = await supabase.rpc('remove_event_member', {
      p_event_id: eventId,
      p_user_id: data.user_id
    })

    if (error) {
      console.error("❌ Error removing event member:", error)
      throw new Error(error.message || "Failed to remove member from event")
    }

    console.log("✅ Member removed from event successfully")

    return {
      success: true
    }
  } catch (error) {
    console.error("❌ Exception removing event member:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove member from event"
    }
  }
}

// Create expense group within an event (reuses existing logic but with event context)
export async function createEventExpenseGroup(
  data: CreateEventExpenseGroupRequest
): Promise<CreateExpenseGroupResponse> {
  try {
    console.log("🔄 Creating expense group in event:", data)

    // Ensure user is authenticated
    await ensureAuthenticated()

    // Validate inputs (reuse existing validation)
    if (!data.name.trim()) {
      throw new Error("Expense name is required")
    }
    if (data.total_amount <= 0) {
      throw new Error("Total amount must be greater than 0")
    }
    if (data.participants.length < 1) {
      throw new Error("At least 1 participant is required")
    }

    // Call enhanced database function that handles event context
    const { data: result, error } = await supabase.rpc('create_expense_group_with_event', {
      p_name: data.name.trim(),
      p_total_amount: data.total_amount,
      p_participants: data.participants,
      p_description: data.description || null,
      p_split_type: data.split_type,
      p_custom_amounts: data.custom_amounts || null,
      p_event_id: data.event_id
    })

    if (error) {
      console.error("❌ Error creating event expense group:", error)
      throw new Error(error.message || "Failed to create expense group in event")
    }

    console.log("✅ Event expense group created with ID:", result)

    return {
      group_id: result,
      success: true
    }
  } catch (error) {
    console.error("❌ Exception creating event expense group:", error)
    return {
      group_id: '',
      success: false,
      message: error instanceof Error ? error.message : "Failed to create expense group in event"
    }
  }
}

// Delete event (only for event owners)
export async function deleteEvent(eventId: string): Promise<{ success: boolean; message?: string }> {
  try {
    console.log("🔄 Deleting event:", eventId)

    // Ensure user is authenticated
    await ensureAuthenticated()

    // Check if user is event owner and if event can be safely deleted
    const { data: eventData } = await supabase
      .from('event_members')
      .select('role, events!inner(id, name)')
      .eq('event_id', eventId)
      .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
      .single()

    if (!eventData || eventData.role !== 'owner') {
      throw new Error('Only event owners can delete events')
    }

    // Check if event has any rooms with outstanding balances
    const { data: roomsWithBalances } = await supabase
      .from('expense_groups')
      .select(`
        id, name,
        expense_participants!inner(
          amount_owed,
          amount_paid
        )
      `)
      .eq('event_id', eventId)

    const hasOutstandingBalances = roomsWithBalances?.some(room =>
      room.expense_participants.some((p: any) => p.amount_owed !== p.amount_paid)
    )

    if (hasOutstandingBalances) {
      throw new Error('Cannot delete event with rooms that have outstanding balances. Settle all expenses first.')
    }

    // Delete the event (cascade will handle related tables)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error("❌ Error deleting event:", error)
      throw new Error(error.message || "Failed to delete event")
    }

    console.log("✅ Event deleted successfully")

    return {
      success: true
    }
  } catch (error) {
    console.error("❌ Exception deleting event:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete event"
    }
  }
}

// Real-time subscription helpers for events
export function subscribeToEventUpdates(
  eventId: string,
  onUpdate: (payload: any) => void
) {
  console.log("🔄 Setting up event real-time subscriptions for:", eventId)

  // Subscribe to event changes
  const eventSubscription = supabase
    .channel(`event-${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${eventId}`
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'event_members',
        filter: `event_id=eq.${eventId}`
      },
      onUpdate
    )
    .subscribe()

  return {
    unsubscribe: () => {
      supabase.removeChannel(eventSubscription)
    }
  }
}

// Export convenience type
export type { CreateExpenseGroupResponse as CreateEventExpenseGroupResponse }