// app/api/roommate/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { setupUserProfile, uploadRoomImages, getFullProfile } from '@/services/roommate-matching'
import type { ProfileFormData, RoomDetailsFormData, SeekerPreferencesFormData } from '@/types/roommate'

export async function GET(request: NextRequest) {
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

    const result = await getFullProfile(user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, profile: result.profile })
  } catch (error) {
    console.error('Error getting profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Parse multipart form data
    const formData = await request.formData()
    
    // Extract profile data
    const profileDataStr = formData.get('profileData') as string
    const roomDataStr = formData.get('roomData') as string | null
    const preferencesDataStr = formData.get('preferencesData') as string | null
    
    if (!profileDataStr) {
      return NextResponse.json(
        { success: false, error: 'Profile data is required' },
        { status: 400 }
      )
    }

    const profileData: ProfileFormData = JSON.parse(profileDataStr)
    const roomData: RoomDetailsFormData | undefined = roomDataStr ? JSON.parse(roomDataStr) : undefined
    const preferences: SeekerPreferencesFormData | undefined = preferencesDataStr ? JSON.parse(preferencesDataStr) : undefined

    // Extract room images
    const roomImages: File[] = []
    for (let i = 0; formData.has(`roomImage_${i}`); i++) {
      const file = formData.get(`roomImage_${i}`) as File
      if (file && file.size > 0) {
        roomImages.push(file)
      }
    }

    // Validate provider images
    if (roomData && roomImages.length < 5) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Providers must upload at least 5 room images',
          validation_errors: { roomImages: 'At least 5 images required' }
        },
        { status: 400 }
      )
    }

    // Setup profile
    const profileResult = await setupUserProfile(user.id, profileData, roomData, preferences)
    
    if (!profileResult.success) {
      return NextResponse.json(
        { success: false, error: profileResult.error },
        { status: 500 }
      )
    }

    // Upload room images if provided
    if (roomImages.length > 0) {
      const imageResult = await uploadRoomImages(user.id, roomImages)
      
      if (!imageResult.success) {
        // Profile was created but images failed - still return success but with warning
        console.warn('Profile created but image upload failed:', imageResult.error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: profileResult.user,
      message: 'Profile setup completed successfully!'
    })
  } catch (error) {
    console.error('Error setting up profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}