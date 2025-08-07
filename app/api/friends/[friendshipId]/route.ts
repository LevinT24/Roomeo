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

    // Use stored function
    const { data: result, error: functionError } = await supabase
      .rpc('remove_friendship', {
        friendship_id: friendshipId,
        user_id: user.id
      })

    if (functionError) {
      console.error('Error removing friendship:', functionError)
      return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 })
    }

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to remove friend' }, { status: 404 })
    }

    return NextResponse.json({
      message: result.message
    })

  } catch (error) {
    console.error('Remove friend API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}