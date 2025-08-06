// app/api/friends/search/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/friends/search?q={query} - Search users by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Search for users by name (excluding current user)
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('id, name, profilePicture, location')
      .ilike('name', `%${query.trim()}%`)
      .neq('id', user.id)
      .limit(20)

    if (searchError) {
      console.error('Error searching users:', searchError)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Get current user's friend requests (sent and received) - handle gracefully if table doesn't exist
    const { data: friendRequests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    // Get current user's friendships - handle gracefully if table doesn't exist  
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    // Log errors for debugging
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
    const usersWithStatus = users?.map(foundUser => {
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
        profilePicture: foundUser.profilePicture,
        location: foundUser.location,
        relationshipStatus
      }
    }) || []

    return NextResponse.json({ users: usersWithStatus })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}