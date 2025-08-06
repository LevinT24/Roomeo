// app/api/friends/requests/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/friends/requests - Get pending friend requests
export async function GET(request: NextRequest) {
  try {
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending friend requests (both sent and received)
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        sender:users!friend_requests_sender_id_fkey(id, name, profilePicture),
        receiver:users!friend_requests_receiver_id_fkey(id, name, profilePicture)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestsError) {
      // If table doesn't exist yet, return empty requests
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

    // Separate sent and received requests
    const sentRequests = requests?.filter(req => req.sender_id === user.id).map(req => ({
      id: req.id,
      type: 'sent' as const,
      userId: req.receiver_id,
      name: req.receiver.name,
      profilePicture: req.receiver.profilePicture,
      createdAt: req.created_at
    })) || []

    const receivedRequests = requests?.filter(req => req.receiver_id === user.id).map(req => ({
      id: req.id,
      type: 'received' as const,
      userId: req.sender_id,
      name: req.sender.name,
      profilePicture: req.sender.profilePicture,
      createdAt: req.created_at
    })) || []

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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.id === receiverId) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
    }

    // Check if receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', receiverId)
      .single()

    if (receiverError || !receiver) {
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
      .select(`
        id,
        created_at,
        receiver:users!friend_requests_receiver_id_fkey(id, name, profilePicture)
      `)
      .single()

    if (createError) {
      console.error('Error creating friend request:', createError)
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Friend request sent successfully',
      request: {
        id: newRequest.id,
        type: 'sent',
        userId: receiverId,
        name: newRequest.receiver.name,
        profilePicture: newRequest.receiver.profilePicture,
        createdAt: newRequest.created_at
      }
    })

  } catch (error) {
    console.error('Send friend request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}