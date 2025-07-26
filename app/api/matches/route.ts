import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user matches from database
    // - Extract user ID from JWT token
    // - Fetch mutual matches from database
    // - Include last message info
    // - Sort by recent activity

    const mockMatches = [
      {
        id: "match_1",
        user: {
          id: "user_2",
          name: "Sophia Clark",
          profilePicture: "/placeholder.svg?height=200&width=200&text=Sophia",
          age: 26,
          userType: "owner",
        },
        matchedAt: new Date(),
        lastMessage: "Hey! Are you still looking for a roommate?",
        lastMessageTime: new Date(),
        unreadCount: 2,
      },
    ]

    return NextResponse.json({ success: true, matches: mockMatches })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch matches" }, { status: 500 })
  }
}
