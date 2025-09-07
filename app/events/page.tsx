// app/events/page.tsx
// Events list page route

import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import EventsListPage from '@/components/events/EventsListPage'

export default async function EventsPage() {
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

  const user = {
    id: session.user.id,
    email: session.user.email!,
    name: userProfile.name,
    profilePicture: userProfile.profilePicture || ''
  }

  return (
    <EventsListPage 
      user={user}
      onEventClick={(eventId) => {
        // This will be handled client-side with router.push
      }}
    />
  )
}