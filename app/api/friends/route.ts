// app/api/friends/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/friends - Get user's friends list
export async function GET(request: NextRequest) {
  try {
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's friendships
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select(`
        id,
        user1_id,
        user2_id,
        created_at,
        user1:users!friendships_user1_id_fkey(id, name, profilePicture),
        user2:users!friendships_user2_id_fkey(id, name, profilePicture)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (friendshipsError) {
      console.error('Friendships error details:', {
        message: friendshipsError.message,
        code: friendshipsError.code,
        details: friendshipsError.details,
        hint: friendshipsError.hint,
        full_error: friendshipsError
      })
      
      // If table doesn't exist yet, return empty friends list
      if (friendshipsError.code === 'PGRST116' || friendshipsError.message?.includes('relation') || friendshipsError.message?.includes('does not exist')) {
        return NextResponse.json({ friends: [] })
      }
      
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
    }

    // Transform data to get friend info
    const friends = friendships?.map(friendship => {
      const friend = friendship.user1_id === user.id ? friendship.user2 : friendship.user1
      return {
        id: friendship.id,
        friendId: friend.id,
        name: friend.name,
        profilePicture: friend.profilePicture,
        friendsSince: friendship.created_at
      }
    }) || []

    return NextResponse.json({ friends })

  } catch (error) {
    console.error('Friends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}