// app/api/roommate/images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { uploadRoomImages, deleteRoomImage, validateProviderImages } from '@/services/roommate-matching'

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

    // Check if user is a provider
    const { data: userData } = await supabase
      .from('users')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.user_role !== 'provider') {
      return NextResponse.json(
        { success: false, error: 'Only providers can upload room images' },
        { status: 403 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const images: File[] = []

    // Extract all images from form data
    for (let i = 0; formData.has(`image_${i}`); i++) {
      const file = formData.get(`image_${i}`) as File
      if (file && file.size > 0) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          return NextResponse.json(
            { success: false, error: `File ${file.name} is not an image` },
            { status: 400 }
          )
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: `File ${file.name} exceeds 5MB limit` },
            { status: 400 }
          )
        }
        
        images.push(file)
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid images provided' },
        { status: 400 }
      )
    }

    // Check current image count
    const { data: currentImages } = await supabase
      .from('room_images')
      .select('id')
      .eq('user_id', user.id)

    const currentCount = currentImages?.length || 0
    const newTotal = currentCount + images.length

    if (newTotal > 10) {
      return NextResponse.json(
        { success: false, error: `Maximum 10 images allowed. You have ${currentCount} and trying to add ${images.length}` },
        { status: 400 }
      )
    }

    // Upload images
    const result = await uploadRoomImages(user.id, images)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      images: result.images,
      message: `Successfully uploaded ${result.images?.length || 0} images`
    })
  } catch (error) {
    console.error('Error uploading room images:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { imageId }: { imageId: string } = await request.json()

    if (!imageId) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Check if user would still have at least 5 images after deletion (for providers)
    const { data: userData } = await supabase
      .from('users')
      .select('user_role')
      .eq('id', user.id)
      .single()

    if (userData?.user_role === 'provider') {
      const { data: images } = await supabase
        .from('room_images')
        .select('id')
        .eq('user_id', user.id)

      if ((images?.length || 0) <= 5) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete image. Providers must have at least 5 images' },
          { status: 400 }
        )
      }
    }

    const result = await deleteRoomImage(imageId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting room image:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const result = await validateProviderImages(user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error validating images:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}