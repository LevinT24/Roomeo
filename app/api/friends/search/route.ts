// ==========================================
// FIXED: app/api/friends/search/route.ts
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

// GET /api/friends/search?q={query} - Search users by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Use authenticated client
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Searching for users with query:', query.trim())

    // Search for users by name (excluding current user) - using correct column names
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('id, name, profilepicture, location') // Note: using lowercase 'profilepicture'
      .ilike('name', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(20)

    if (searchError) {
      console.error('Error searching users:', searchError)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    console.log('✅ Found users:', users?.length || 0)

    if (!users || users.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Get user IDs for relationship checking
    const userIds = users.map(u => u.id)

    console.log('🔍 Checking relationships for user IDs:', userIds.length)

    // Get current user's friend requests (sent and received) - handle gracefully if table doesn't exist
    const { data: friendRequests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'pending')

    // Get current user's friendships - handle gracefully if table doesn't exist  
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    // Log errors for debugging but continue
    if (requestsError) {
      console.error('Friend requests error:', {
        message: requestsError.message,
        code: requestsError.code,
        details: requestsError.details
      })
    }
    
    if (friendshipsError) {
      console.error('Friendships error:', {
        message: friendshipsError.message, 
        code: friendshipsError.code,
        details: friendshipsError.details
      })
    }

    // If tables don't exist yet (relation does not exist error), treat as empty data
    const safeFriendRequests = (requestsError?.code === 'PGRST116' || requestsError?.message?.includes('relation') || requestsError?.message?.includes('does not exist')) ? [] : (friendRequests || [])
    const safeFriendships = (friendshipsError?.code === 'PGRST116' || friendshipsError?.message?.includes('relation') || friendshipsError?.message?.includes('does not exist')) ? [] : (friendships || [])

    console.log('✅ Found relationships - requests:', safeFriendRequests.length, 'friendships:', safeFriendships.length)

    // Create sets for quick lookup
    const friendIds = new Set()
    const sentRequestIds = new Set()
    const receivedRequestIds = new Set()

    safeFriendships.forEach(friendship => {
      const friendId = friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id
      friendIds.add(friendId)
    })

    safeFriendRequests.forEach(request => {
      if (request.sender_id === user.id && request.status === 'pending') {
        sentRequestIds.add(request.receiver_id)
      } else if (request.receiver_id === user.id && request.status === 'pending') {
        receivedRequestIds.add(request.sender_id)
      }
    })

    // Add relationship status to each user
    const usersWithStatus = users.map(foundUser => {
      let relationshipStatus = 'stranger'
      
      if (friendIds.has(foundUser.id)) {
        relationshipStatus = 'friend'
      } else if (sentRequestIds.has(foundUser.id)) {
        relationshipStatus = 'request_sent'
      } else if (receivedRequestIds.has(foundUser.id)) {
        relationshipStatus = 'request_received'
      }

      return {
        id: foundUser.id,
        name: foundUser.name,
        profilePicture: foundUser.profilepicture || null, // Note: using lowercase column name
        location: foundUser.location,
        relationshipStatus
      }
    })

    console.log('✅ Returning users with status:', usersWithStatus.length)

    return NextResponse.json({ users: usersWithStatus })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}