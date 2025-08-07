// ==========================================
// 5. UPDATE: app/api/friends/[friendshipId]/route.ts
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

// DELETE /api/friends/[friendshipId] - Remove/unfriend a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { friendshipId: string } }
) {
  try {
    const { friendshipId } = params

    // Create authenticated Supabase client with user context
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
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