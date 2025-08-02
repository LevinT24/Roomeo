// services/supabase.ts
import { supabase } from "@/lib/supabase";

export async function getUserProfile(uid: string): Promise<any | null> {
  try {
    console.log("🔍 Fetching user profile for:", uid);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      // Check if it's a "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        console.log("📝 User profile not found - user may not have completed profile setup");
        return null;
      }
      
      // Check if it's a 406 error (content negotiation)
      if (error.code === '406') {
        console.log("⚠️ 406 error - checking if user exists in auth but not in users table");
        return null;
      }
      
      console.error("❌ Error getting user profile:", error);
      return null;
    }

    console.log("✅ User profile found:", data);
    return data;
  } catch (error) {
    console.error("❌ Exception getting user profile:", error);
    return null;
  }
}

export async function updateUserProfile(uid: string, updates: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updatedAt: new Date()
      })
      .eq('id', uid);

    if (error) {
      console.error("Error updating user profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return false;
  }
}

export async function createUserProfile(userData: any): Promise<boolean> {
  try {
    console.log("🔄 Creating user profile:", userData);
    
    const { error } = await supabase
      .from('users')
      .insert(userData);

    if (error) {
      console.error("❌ Error creating user profile:", error);
      return false;
    }

    console.log("✅ User profile created successfully");
    return true;
  } catch (error) {
    console.error("❌ Exception creating user profile:", error);
    return false;
  }
}

export async function ensureUserProfile(uid: string, email: string, name: string): Promise<boolean> {
  try {
    console.log("🔍 Ensuring user profile exists for:", uid);
    
    // First check if profile exists
    const existingProfile = await getUserProfile(uid);
    
    if (existingProfile) {
      console.log("✅ User profile already exists");
      return true;
    }
    
    // Create new profile if it doesn't exist
    console.log("📝 Creating new user profile");
    const userDoc = {
      id: uid,
      uid: uid,
      email: email,
      name: name,
      profilePicture: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerified: false,
      age: null,
      bio: "",
      location: "",
      budget: null,
      preferences: {
        smoking: false,
        drinking: false,
        vegetarian: false,
        pets: false,
      },
      userType: null,
      lifestyle: {},
    };

    const success = await createUserProfile(userDoc);
    
    if (success) {
      // Verify the profile was created by trying to fetch it again
      const verifyProfile = await getUserProfile(uid);
      if (verifyProfile) {
        console.log("✅ User profile verified after creation");
        return true;
      } else {
        console.warn("⚠️ Profile creation succeeded but verification failed");
        return false;
      }
    }
    
    return success;
  } catch (error) {
    console.error("❌ Error ensuring user profile:", error);
    return false;
  }
} 