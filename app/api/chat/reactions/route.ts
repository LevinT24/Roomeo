import { type NextRequest, NextResponse } from "next/server"
import { addMessageReaction, removeMessageReaction } from "@/services/enhanced-chat"

export async function POST(request: NextRequest) {
  try {
    const { messageId, userId, emoji } = await request.json()

    if (!messageId || !userId || !emoji) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await addMessageReaction(messageId, userId, emoji)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in reactions API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { messageId, userId, emoji } = await request.json()

    if (!messageId || !userId || !emoji) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await removeMessageReaction(messageId, userId, emoji)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in reactions DELETE API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}