import { type NextRequest, NextResponse } from "next/server"
import { createPoll, votePoll } from "@/services/enhanced-chat"

export async function POST(request: NextRequest) {
  try {
    const { chatId, messageId, question, options, userId, multipleChoice, expiresIn } = await request.json()

    if (!chatId || !messageId || !question || !options || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await createPoll(
      chatId,
      messageId,
      question,
      options,
      userId,
      multipleChoice || false,
      expiresIn
    )
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in polls API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}