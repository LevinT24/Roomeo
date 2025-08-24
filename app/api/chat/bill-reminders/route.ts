import { type NextRequest, NextResponse } from "next/server"
import { 
  createRecurringBillReminder, 
  updateBillReminder, 
  disableBillReminder, 
  getChatBillReminders,
  processBillReminders 
} from "@/services/bill-reminders-bot"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: "Missing chatId parameter" },
        { status: 400 }
      )
    }

    const result = await getChatBillReminders(chatId)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in bill reminders GET API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, title, description, amount, dueDate, frequency, userId } = await request.json()

    if (!chatId || !title || !dueDate || !frequency || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const config = {
      chatId,
      title,
      description,
      amount: amount ? parseFloat(amount) : undefined,
      dueDate: new Date(dueDate),
      frequency,
      reminderDays: [1, 3, 7], // Default reminder schedule
      userId
    }

    const result = await createRecurringBillReminder(config)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in bill reminders POST API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { reminderId, updates } = await request.json()

    if (!reminderId || !updates) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Convert date strings to Date objects
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate)
    }

    const result = await updateBillReminder(reminderId, updates)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in bill reminders PATCH API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { reminderId } = await request.json()

    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: "Missing reminderId" },
        { status: 400 }
      )
    }

    const result = await disableBillReminder(reminderId)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in bill reminders DELETE API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}