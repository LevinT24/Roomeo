// ==========================================
// COMPLETE FIX: Update ALL friends API routes with correct column names
// ==========================================

// ==========================================
// 1. UPDATED: app/api/friends/route.ts
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to authenticate requests
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing authorization header" }
  }

  const token = authHeader.split(" ")[1]
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { user: null, error: "Invalid token" }
  }

  return { user, error: null }
}

// GET /api/friends - Get user's friends list
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('🔍 Fetching friendships for user:', user.id)

    // First, get friendships without joins
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (friendshipsError) {
      console.error('Friendships error:', friendshipsError)
      
      if (friendshipsError.code === 'PGRST116' || friendshipsError.message?.includes('relation') || friendshipsError.message?.includes('does not exist')) {
        return NextResponse.json({ friends: [] })
      }
      
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
    }

    console.log('✅ Found friendships:', friendships?.length || 0)

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ friends: [] })
    }

    // Get friend user IDs
    const friendUserIds = friendships.map(friendship => {
      return friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id
    })

    console.log('🔍 Fetching friend profiles for IDs:', friendUserIds)

    // Fetch friend profiles separately - USING CORRECT COLUMN NAME
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name, profilepicture, location') // Changed to lowercase 'profilepicture'
      .in('id', friendUserIds)

    if (profilesError) {
      console.error('Error fetching friend profiles:', profilesError)
    }

    console.log('✅ Found friend profiles:', friendProfiles?.length || 0)

    // Create a map of user profiles for quick lookup
    const profilesMap = new Map()
    friendProfiles?.forEach(profile => {
      profilesMap.set(profile.id, {
        id: profile.id,
        name: profile.name || 'Unknown User',
        profilePicture: profile.profilepicture || null // Using lowercase column name
      })
    })

    // Transform data to get friend info
    const friends = friendships.map(friendship => {
      const friendId = friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id
      const friendProfile = profilesMap.get(friendId) || {
        id: friendId,
        name: 'Unknown User',
        profilePicture: null
      }

      return {
        id: friendship.id,
        friendId: friendId,
        name: friendProfile.name,
        profilePicture: friendProfile.profilePicture,
        friendsSince: friendship.created_at
      }
    })

    console.log('✅ Returning friends:', friends.length)

    return NextResponse.json({ friends })

  } catch (error) {
    console.error('Friends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
