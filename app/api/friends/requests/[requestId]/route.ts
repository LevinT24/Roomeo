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
  
  // Create Supabase client with anon key (for calling functions)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Verify the token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { supabase: null, user: null, error: "Invalid token" }
  }

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

    // Use stored function
    const { data: result, error: functionError } = await supabase
      .rpc('handle_friend_request', {
        request_id: requestId,
        user_id: user.id,
        action: action
      })

    if (functionError) {
      console.error('Error handling friend request:', functionError)
      return NextResponse.json({ error: 'Failed to process friend request' }, { status: 500 })
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to process friend request' }, { status: 404 })
    }

    return NextResponse.json(result)

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
