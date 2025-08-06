// app/api/friends/requests/[requestId]/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/friends/requests/[requestId] - Accept or decline friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { action } = await request.json() // 'accept' or 'decline'
    const { requestId } = params

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "accept" or "decline"' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the friend request
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        sender:users!friend_requests_sender_id_fkey(id, name, profilePicture)
      `)
      .eq('id', requestId)
      .eq('receiver_id', user.id) // Only receiver can accept/decline
      .eq('status', 'pending')
      .single()

    if (requestError || !friendRequest) {
      return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 })
    }

    if (action === 'accept') {
      // Use the database function to accept the friend request
      const { error: acceptError } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      })

      if (acceptError) {
        console.error('Error accepting friend request:', acceptError)
        return NextResponse.json({ error: 'Failed to accept friend request' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Friend request accepted successfully',
        friendship: {
          friendId: friendRequest.sender_id,
          name: friendRequest.sender.name,
          profilePicture: friendRequest.sender.profilePicture
        }
      })

    } else if (action === 'decline') {
      // Update friend request status to declined
      const { error: declineError } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)

      if (declineError) {
        console.error('Error declining friend request:', declineError)
        return NextResponse.json({ error: 'Failed to decline friend request' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Friend request declined successfully'
      })
    }

  } catch (error) {
    console.error('Friend request action API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/friends/requests/[requestId] - Cancel/delete a friend request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the friend request (user can only delete requests they sent)
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', user.id)

    if (deleteError) {
      console.error('Error deleting friend request:', deleteError)
      return NextResponse.json({ error: 'Failed to cancel friend request' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Friend request cancelled successfully'
    })

  } catch (error) {
    console.error('Delete friend request API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}