// app/api/roommate/match/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { performMatchAction, getUserMatches } from '@/services/roommate-matching'
import { createOrGetEnhancedChat } from '@/services/enhanced-chat'
import type { MatchType } from '@/types/roommate'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await getUserMatches(user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, matches: result.matches })
  } catch (error) {
    console.error('Error getting user matches:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { targetUserId, action }: { targetUserId: string; action: MatchType } = await request.json()

    // Validate input
    if (!targetUserId || !action) {
      return NextResponse.json(
        { success: false, error: 'Target user ID and action are required' },
        { status: 400 }
      )
    }

    if (!['like', 'pass', 'super_like'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "like", "pass", or "super_like"' },
        { status: 400 }
      )
    }

    // Prevent self-matching
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot match with yourself' },
        { status: 400 }
      )
    }

    // Perform match action
    const result = await performMatchAction(user.id, targetUserId, action)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    let chatId: string | undefined

    // If it's a mutual match, create a chat
    if (result.is_mutual_match) {
      const chatResult = await createOrGetEnhancedChat(user.id, targetUserId)
      if (chatResult.success && chatResult.chat) {
        chatId = chatResult.chat.id
      }
    }

    return NextResponse.json({ 
      success: true, 
      is_mutual_match: result.is_mutual_match,
      match_id: result.match_id,
      chat_id: chatId,
      message: result.is_mutual_match ? "🎉 It's a match! You can now chat with each other." : "Match recorded successfully"
    })
  } catch (error) {
    console.error('Error performing match action:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}