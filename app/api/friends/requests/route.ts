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

// GET /api/friends/requests - Get pending friend requests
export async function GET(request: NextRequest) {
  try {
    // Create authenticated Supabase client with user context
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Fetching friend requests for user:', user.id)

    // Get friend requests without joins first
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestsError) {
      if (requestsError.code === 'PGRST116') {
        return NextResponse.json({ 
          sentRequests: [], 
          receivedRequests: [], 
          totalPending: 0 
        })
      }
      console.error('Error fetching friend requests:', requestsError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    console.log('✅ Found friend requests:', requests?.length || 0)

    if (!requests || requests.length === 0) {
      return NextResponse.json({ 
        sentRequests: [], 
        receivedRequests: [], 
        totalPending: 0 
      })
    }

    // Get unique user IDs from requests
    const userIds = Array.from(new Set([
      ...requests.map(req => req.sender_id),
      ...requests.map(req => req.receiver_id)
    ]))

    console.log('🔍 Fetching user profiles for requests:', userIds.length)

    // Fetch user profiles separately - USING CORRECT COLUMN NAME
    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name, profilepicture, location') // Changed to lowercase 'profilepicture'
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
    }

    // Create a map of user profiles
    const profilesMap = new Map()
    userProfiles?.forEach(profile => {
      profilesMap.set(profile.id, {
        id: profile.id,
        name: profile.name || 'Unknown User',
        profilePicture: profile.profilepicture || null // Using lowercase column name
      })
    })

    // Separate sent and received requests
    const sentRequests = requests.filter(req => req.sender_id === user.id).map(req => {
      const receiverProfile = profilesMap.get(req.receiver_id) || {
        name: 'Unknown User',
        profilePicture: null
      }
      
      return {
        id: req.id,
        type: 'sent' as const,
        userId: req.receiver_id,
        name: receiverProfile.name,
        profilePicture: receiverProfile.profilePicture,
        createdAt: req.created_at
      }
    })

    const receivedRequests = requests.filter(req => req.receiver_id === user.id).map(req => {
      const senderProfile = profilesMap.get(req.sender_id) || {
        name: 'Unknown User',
        profilePicture: null
      }
      
      return {
        id: req.id,
        type: 'received' as const,
        userId: req.sender_id,
        name: senderProfile.name,
        profilePicture: senderProfile.profilePicture,
        createdAt: req.created_at
      }
    })

    console.log('✅ Returning requests - sent:', sentRequests.length, 'received:', receivedRequests.length)

    return NextResponse.json({
      sentRequests,
      receivedRequests,
      totalPending: sentRequests.length + receivedRequests.length
    })

  } catch (error) {
    console.error('Friend requests API error:', error)
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

    if (user.id === receiverId) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
    }

    console.log('🔍 Sending friend request from', user.id, 'to', receiverId)

    // Check if receiver exists - USING CORRECT COLUMN NAME
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id, name, profilepicture, location') // Changed to lowercase 'profilepicture'
      .eq('id', receiverId)
      .single()

    if (receiverError || !receiver) {
      console.error('Receiver not found:', receiverError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for existing request or friendship
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      .single()

    if (existingRequest) {
      return NextResponse.json({ error: 'Friend request already exists' }, { status: 409 })
    }

    // Check if already friends
    const smallerId = user.id < receiverId ? user.id : receiverId
    const largerId = user.id > receiverId ? user.id : receiverId
    
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user1_id', smallerId)
      .eq('user2_id', largerId)
      .single()

    if (existingFriendship) {
      return NextResponse.json({ error: 'Already friends with this user' }, { status: 409 })
    }

    // Create friend request
    const { data: newRequest, error: createError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId
      })
      .select('id, created_at')
      .single()

    if (createError) {
      console.error('Error creating friend request:', {
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint,
        user_id: user.id,
        receiver_id: receiverId
      })
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 })
    }

    console.log('✅ Friend request created successfully:', newRequest?.id)

    return NextResponse.json({
      message: 'Friend request sent successfully',
      request: {
        id: newRequest?.id,
        type: 'sent',
        userId: receiverId,
        name: receiver.name || 'Unknown User',
        profilePicture: receiver.profilepicture || null, // Using lowercase column name
        createdAt: newRequest?.created_at
      }
    })

  } catch (error) {
    console.error('Send friend request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}