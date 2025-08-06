// app/api/friends/debug/route.ts
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Debug - Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    })
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: authError?.message || 'No user found'
      }, { status: 401 })
    }

    // Test basic users table query
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(3)

    console.log('Debug - Users query:', {
      usersCount: usersData?.length || 0,
      usersError: usersError?.message,
      usersErrorCode: usersError?.code
    })

    // Test friends tables existence
    const { data: friendRequestsData, error: friendRequestsError } = await supabase
      .from('friend_requests')
      .select('id')
      .limit(1)

    console.log('Debug - Friend requests query:', {
      friendRequestsError: friendRequestsError?.message,
      friendRequestsErrorCode: friendRequestsError?.code
    })

    const { data: friendshipsData, error: friendshipsError } = await supabase
      .from('friendships')
      .select('id')
      .limit(1)

    console.log('Debug - Friendships query:', {
      friendshipsError: friendshipsError?.message,
      friendshipsErrorCode: friendshipsError?.code
    })

    return NextResponse.json({
      message: 'Debug info logged to console',
      currentUser: {
        id: user.id,
        email: user.email
      },
      tables: {
        users: {
          accessible: !usersError,
          count: usersData?.length || 0,
          error: usersError?.message
        },
        friend_requests: {
          accessible: !friendRequestsError,
          error: friendRequestsError?.message
        },
        friendships: {
          accessible: !friendshipsError,
          error: friendshipsError?.message
        }
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}