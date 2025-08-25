import { type NextRequest, NextResponse } from "next/server"
import { removeMatch } from "@/services/matches"

export async function DELETE(request: NextRequest) {
  try {
    const { userId, matchedUserId } = await request.json()

    if (!userId || !matchedUserId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or matchedUserId" },
        { status: 400 }
      )
    }

    const result = await removeMatch(userId, matchedUserId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in remove match API:', error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}