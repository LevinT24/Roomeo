// app/api/friends/[friendshipId]/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/friends/[friendshipId] - Remove/unfriend a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { friendshipId: string } }
) {
  try {
    const { friendshipId } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the friendship to verify user is part of it
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('id, user1_id, user2_id')
      .eq('id', friendshipId)
      .single()

    if (friendshipError || !friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 })
    }

    // Verify user is part of this friendship
    if (friendship.user1_id !== user.id && friendship.user2_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to remove this friendship' }, { status: 403 })
    }

    // Delete the friendship
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (deleteError) {
      console.error('Error deleting friendship:', deleteError)
      return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Friend removed successfully'
    })

  } catch (error) {
    console.error('Remove friend API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}