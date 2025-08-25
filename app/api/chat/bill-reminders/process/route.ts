import { type NextRequest, NextResponse } from "next/server"
import { processBillReminders } from "@/services/bill-reminders-bot"

// This endpoint can be called by a cron job service like Vercel Cron or external scheduler
export async function POST(request: NextRequest) {
  try {
    // Verify this is coming from a legitimate source (in production, use API keys or tokens)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log('🤖 Processing bill reminders...')
    await processBillReminders()
    
    return NextResponse.json({ 
      success: true, 
      message: "Bill reminders processed successfully",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error processing bill reminders:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: "healthy", 
    service: "bill-reminders-bot",
    timestamp: new Date().toISOString()
  })
}