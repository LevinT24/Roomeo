// This API route is deprecated - friends operations are now handled client-side
// for better authentication and session management
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { success: false, message: 'Use client-side friends operations' },
    { status: 410 }
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, message: 'Use client-side friends operations' },
    { status: 410 }
  )
}