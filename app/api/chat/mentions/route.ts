import { type NextRequest, NextResponse } from "next/server"
import { createMention } from "@/services/enhanced-chat"

export async function POST(request: NextRequest) {
  try {
    const { messageId, mentionedUserId, mentionedBy } = await request.json()

    if (!messageId || !mentionedUserId || !mentionedBy) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await createMention(messageId, mentionedUserId, mentionedBy)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in mentions API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}