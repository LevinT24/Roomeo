// ==========================================
// COMPLETE FIX: Update ALL friends API routes with correct column names
// ==========================================

// ==========================================
// 1. UPDATED: app/api/friends/route.ts
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

// GET /api/friends - Get user's friends list
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await createAuthenticatedSupabaseClient(request)
    
    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Fetching friendships for user:', user.id)

    // Use stored function
    const { data: result, error: functionError } = await supabase
      .rpc('get_friends_list', { user_id: user.id })

    if (functionError) {
      console.error('Error fetching friends:', functionError)
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
    }

    console.log('✅ Returning friends:', result?.friends?.length || 0)

    return NextResponse.json(result || { friends: [] })

  } catch (error) {
    console.error('Friends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
