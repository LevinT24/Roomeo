import { type NextRequest, NextResponse } from "next/server"
import { pinMessage, unpinMessage } from "@/services/enhanced-chat"

export async function POST(request: NextRequest) {
  try {
    const { chatId, messageId, userId } = await request.json()

    if (!chatId || !messageId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await pinMessage(chatId, messageId, userId)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in pin API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { chatId, messageId } = await request.json()

    if (!chatId || !messageId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await unpinMessage(chatId, messageId)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in unpin API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}