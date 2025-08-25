import { type NextRequest, NextResponse } from "next/server"
import { assignChore, completeChore } from "@/services/enhanced-chat"

export async function POST(request: NextRequest) {
  try {
    const { chatId, choreName, assignedTo, assignedBy, dueDate, messageId } = await request.json()

    if (!chatId || !choreName || !assignedTo || !assignedBy) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const dueDateObj = dueDate ? new Date(dueDate) : undefined
    const result = await assignChore(
      chatId,
      choreName,
      assignedTo,
      assignedBy,
      dueDateObj,
      messageId
    )
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in chores API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { choreId, userId, action } = await request.json()

    if (!choreId || !userId || action !== 'complete') {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      )
    }

    const result = await completeChore(choreId, userId)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in chores PATCH API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}