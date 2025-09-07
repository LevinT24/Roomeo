// app/events/[eventId]/page.tsx
// Individual event page route

import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import EventPage from '@/components/events/EventPage'

interface EventDetailsPageProps {
  params: {
    eventId: string
  }
}

export default async function EventDetailsPage({ params }: EventDetailsPageProps) {
  const supabase = createServerComponentClient({ cookies })
  
  // Check authentication
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session?.user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!userProfile) {
    redirect('/auth')
  }

  // Verify user has access to this event
  const { data: eventMember } = await supabase
    .from('event_members')
    .select('event_id')
    .eq('event_id', params.eventId)
    .eq('user_id', session.user.id)
    .single()

  if (!eventMember) {
    redirect('/events') // Redirect to events list if no access
  }

  const user = {
    id: session.user.id,
    email: session.user.email!,
    name: userProfile.name,
    profilePicture: userProfile.profilePicture || ''
  }

  return (
    <EventPage 
      user={user}
      eventId={params.eventId}
      onNavigateBack={() => {
        // This will be handled client-side with router.push
      }}
    />
  )
}