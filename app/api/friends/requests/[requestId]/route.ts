// FIXED & UPDATED: app/api/friends/requests/[requestId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  name: string
  profilepicture?: string | null
  location?: string | null
}

// Helper function to create authenticated Supabase client
async function createAuthenticatedSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { supabase: null, user: null, error: "Missing authorization header" }
  }

  const token = authHeader.split(" ")[1]
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Verify the token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { supabase: null, user: null, error: "Invalid token" }
  }

  // CRITICAL: Set the session on the client for RLS context
  // This ensures auth.uid() works in RLS policies
  await supabase.auth.setSession({
    access_token: token,
    refresh_token: '', // Not needed for this operation
  })

  return { supabase, user, error: null }
}

// PATCH: Accept or Decline Friend Request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { action } = await request.json()
    const { requestId } = params

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "accept" or "decline"' }, { status: 400 })
    }

    // Create authenticated Supabase client with user context
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .single()

    if (requestError || !friendRequest) {
      return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 })
    }

    // ✅ UPDATED SELECT: lowercase 'profilepicture' & added location
    const { data: senderProfile, error: senderError } = await supabase
      .from('users')
      .select('id, name, profilepicture, location')
      .eq('id', friendRequest.sender_id)
      .single()

    if (senderError) {
      console.error('Error fetching sender profile:', senderError)
    }

    const saferSenderProfile: UserProfile = {
      id: friendRequest.sender_id,
      name: senderProfile?.name || 'Unknown User',
      profilepicture: senderProfile?.profilepicture || null,
      location: senderProfile?.location || null
    }

    if (action === 'accept') {
      const { error: acceptError } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      })

      if (acceptError) {
        if (acceptError.message?.includes('function') || acceptError.message?.includes('does not exist')) {
          const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)

          if (updateError) {
            return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 })
          }

          const smallerId = friendRequest.sender_id < user.id ? friendRequest.sender_id : user.id
          const largerId = friendRequest.sender_id > user.id ? friendRequest.sender_id : user.id

          const { error: friendshipError } = await supabase
            .from('friendships')
            .insert({ user1_id: smallerId, user2_id: largerId })

          if (friendshipError && !friendshipError.message?.includes('duplicate')) {
            return NextResponse.json({ error: 'Failed to create friendship' }, { status: 500 })
          }
        } else {
          return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 })
        }
      }

      return NextResponse.json({
        message: 'Friend request accepted successfully',
        friendship: {
          friendId: saferSenderProfile.id,
          name: saferSenderProfile.name,
          profilePicture: saferSenderProfile.profilepicture
        }
      })
    } else if (action === 'decline') {
      const { error: declineError } = await supabase
        .from('friend_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (declineError) {
        return NextResponse.json({ error: 'Failed to decline friend request' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Friend request declined successfully' })
    }

  } catch (error) {
    console.error('Friend request action API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Cancel or Delete Friend Request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params
    
    // Create authenticated Supabase client with user context
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)

    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .eq('sender_id', user.id)
      .single()

    if (checkError || !existingRequest) {
      return NextResponse.json({ error: 'Friend request not found or unauthorized' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to cancel friend request' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Friend request cancelled successfully' })

  } catch (error) {
    console.error('Delete friend request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
