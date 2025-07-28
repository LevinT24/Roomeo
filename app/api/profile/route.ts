// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function GET(request: NextRequest) {
  try {
    // Get token from headers
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.split(" ")[1]
    
    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Get user from Firestore
    const userRef = adminDb.collection("users").doc(uid)
    const doc = await userRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      )
    }

    const profile = doc.data()
    
    return NextResponse.json({
      success: true,
      profile: {
        id: uid,
        email: decodedToken.email,
        name: profile?.name || "",
        profilePicture: profile?.profilePicture || "",
        age: profile?.age || null,
        bio: profile?.bio || "",
        location: profile?.location || "",
        budget: profile?.budget || null,
        preferences: profile?.preferences || {},
        userType: profile?.userType || null
      }
    })
  } catch (error) {
    console.error("Failed to fetch profile:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get token from headers
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.split(" ")[1]
    
    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid
    const profileData = await request.json()

    // Validate required fields
    if (!profileData.age || !profileData.preferences) {
      return NextResponse.json(
        { success: false, message: "Age and preferences are required" },
        { status: 400 }
      )
    }

    // Update user in Firestore
    const userRef = adminDb.collection("users").doc(uid)
    await userRef.set({
      ...profileData,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: profileData
    })
  } catch (error) {
    console.error("Failed to update profile:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update profile" },
      { status: 500 }
    )
  }
}