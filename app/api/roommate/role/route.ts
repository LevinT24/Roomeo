// app/api/roommate/role/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { setUserRole } from '@/services/roommate-matching'
import type { UserRole } from '@/types/roommate'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { role }: { role: UserRole } = await request.json()

    // Validate role
    if (!role || !['seeker', 'provider'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "seeker" or "provider"' },
        { status: 400 }
      )
    }

    // Set user role
    const result = await setUserRole(user.id, role)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting user role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}