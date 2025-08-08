// This API route is deprecated - expense operations are now handled client-side
// for better authentication and session management
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: { settlementId: string } }) {
  return NextResponse.json(
    { success: false, message: 'Use client-side expense operations' },
    { status: 410 }
  )
}

export async function GET(request: NextRequest, { params }: { params: { settlementId: string } }) {
  return NextResponse.json(
    { success: false, message: 'Use client-side expense operations' },
    { status: 410 }
  )
}