import { type NextRequest, NextResponse } from "next/server"
import { proposeExpenseSplit } from "@/services/enhanced-chat"

export async function POST(request: NextRequest) {
  try {
    const { chatId, messageId, description, amount, userId } = await request.json()

    if (!chatId || !messageId || !description || !amount || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await proposeExpenseSplit(
      chatId,
      messageId,
      description,
      parseFloat(amount),
      userId
    )
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in expenses API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}