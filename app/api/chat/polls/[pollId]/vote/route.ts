import { type NextRequest, NextResponse } from "next/server"
import { votePoll } from "@/services/enhanced-chat"

export async function POST(
  request: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    const { userId, optionIndex } = await request.json()
    const pollId = params.pollId

    if (!pollId || !userId || optionIndex === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const result = await votePoll(pollId, userId, optionIndex)
    
    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('Error in poll vote API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}