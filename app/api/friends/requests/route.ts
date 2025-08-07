// ==========================================
// 2. UPDATED: app/api/friends/requests/route.ts
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// GET /api/friends/requests - Get pending friend requests
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/friends/requests - Starting request')
    
    // Create authenticated Supabase client with user context
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
      console.error('❌ Authentication failed:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Authentication successful for user:', user.id)
    console.log('🔍 Fetching friend requests for user:', user.id)

    // Use stored function instead of direct queries
    const { data: result, error: functionError } = await supabase
      .rpc('get_friend_requests', { user_id: user.id })

    if (functionError) {
      console.error('❌ Error fetching friend requests:', functionError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    console.log('✅ Successfully fetched friend requests:', {
      sent: result?.sentRequests?.length || 0,
      received: result?.receivedRequests?.length || 0,
      total: result?.totalPending || 0
    })

    return NextResponse.json(result || {
      sentRequests: [],
      receivedRequests: [],
      totalPending: 0
    })

  } catch (error) {
    console.error('❌ Friend requests API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/friends/requests - Send a friend request
export async function POST(request: NextRequest) {
  try {
    const { receiverId } = await request.json()

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 })
    }

    // Create authenticated Supabase client with user context
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Sending friend request from', user.id, 'to', receiverId)

    // Use stored function instead of direct INSERT
    const { data: result, error: functionError } = await supabase
      .rpc('send_friend_request', {
        sender_user_id: user.id,
        receiver_user_id: receiverId
      })

    if (functionError) {
      console.error('Error calling send_friend_request function:', functionError)
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 })
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to send friend request' }, { status: 409 })
    }

    console.log('✅ Friend request sent successfully:', result.request_id)

    return NextResponse.json({
      message: 'Friend request sent successfully',
      request: result.request
    })

  } catch (error) {
    console.error('Send friend request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}