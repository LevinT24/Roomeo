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
    console.log("🔄 Updating user profile:");
    console.log("   - User ID:", uid);
    console.log("   - Updates:", updates);
    
    // Check current auth state
    const { data: { user: currentAuthUser }, error: authError } = await supabase.auth.getUser();
    console.log("🔍 Current auth user during update:", currentAuthUser?.id);
    console.log("🔍 Auth error during update:", authError);
    
    // Verify the user is authenticated and matches the profile being updated
    if (authError || !currentAuthUser) {
      console.error("❌ User not authenticated during update");
      return false;
    }
    
    if (currentAuthUser.id !== uid) {
      console.error("❌ Auth user ID doesn't match profile ID being updated");
      return false;
    }
    
    // Convert ALL camelCase field names to lowercase to match database schema
    const convertedUpdates = { ...updates };
    
    // COMPLETE conversion map for all known fields
    const fieldConversions: { [key: string]: string } = {
      'profilePicture': 'profilepicture',
      'userType': 'usertype', 
      'updatedAt': 'updatedat',
      'createdAt': 'createdat',
      'isVerified': 'isverified',
      'universityAffiliation': 'universityaffiliation',
      'professionalStatus': 'professionalstatus'
    };
    
    // Apply all conversions
    Object.keys(fieldConversions).forEach(camelCase => {
      if (convertedUpdates[camelCase] !== undefined) {
        convertedUpdates[fieldConversions[camelCase]] = convertedUpdates[camelCase];
        delete convertedUpdates[camelCase];
      }
    });
    
    // Prepare update data without automatic timestamp
    const updateData = {
      ...convertedUpdates
    };
    
    console.log("🔄 About to update with data:", updateData);
    console.log("🔍 Field names being sent:", Object.keys(updateData));
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', uid)
      .select(); // Return updated data to confirm

    if (error) {
      console.error("❌ UPDATE FAILED:");
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error details:", error.details);
      console.error("❌ Error hint:", error.hint);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      return false;
    }

    console.log("✅ Profile updated successfully!");
    console.log("✅ Updated data:", data);
    return true;
  } catch (error) {
    console.error("❌ Exception during profile update:", error);
    console.error("❌ Exception stack:", (error as Error).stack);
    return false;
  }
}

export async function createUserProfile(userData: any): Promise<boolean> {
  try {
    console.log("🔄 Creating user profile with data:", userData);
    
    // Debug: Check current auth state
    const { data: { user: currentAuthUser }, error: authError } = await supabase.auth.getUser();
    console.log("🔍 Current auth user:", currentAuthUser?.id);
    console.log("🔍 Auth error:", authError);
    
    // Debug: Check if the users table exists and what columns it has
    console.log("🔍 Testing table access...");
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error("❌ Users table access error:", tableError);
      console.error("❌ Table error details:", {
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint,
        code: tableError.code
      });
      return false;
    }
    console.log("✅ Users table is accessible");
    
    // Convert camelCase to lowercase for database compatibility
    const convertedUserData = { ...userData };
    const fieldConversions: { [key: string]: string } = {
      'profilePicture': 'profilepicture',
      'userType': 'usertype', 
      'updatedAt': 'updatedat',
      'createdAt': 'createdat',
      'isVerified': 'isverified',
      'universityAffiliation': 'universityaffiliation',
      'professionalStatus': 'professionalstatus'
    };
    
    // Apply all conversions
    Object.keys(fieldConversions).forEach(camelCase => {
      if (convertedUserData[camelCase] !== undefined) {
        convertedUserData[fieldConversions[camelCase]] = convertedUserData[camelCase];
        delete convertedUserData[camelCase];
      }
    });
    
    // Debug: Log the exact insert data and structure
    console.log("🔍 About to insert this exact data:");
    console.log("📋 Data keys:", Object.keys(convertedUserData));
    console.log("📋 Data values:", Object.values(convertedUserData));
    console.log("📋 Full data object:", JSON.stringify(convertedUserData, null, 2));
    
    // Attempt the insert with detailed error catching
    console.log("🔄 Attempting insert...");
    const { data: insertResult, error } = await supabase
      .from('users')
      .insert(convertedUserData)
      .select(); // Return the inserted data to confirm it worked

    if (error) {
      console.error("❌ INSERT FAILED:");
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error details:", error.details);
      console.error("❌ Error hint:", error.hint);
      console.error("❌ Full error object:", JSON.stringify(error, null, 2));
      
      // Additional debugging for common error codes
      if (error.code === '42501') {
        console.error("🚨 PERMISSION DENIED: RLS policy is blocking this insert");
        console.error("🔍 Check if auth.uid() matches the id field:", convertedUserData.id);
      }
      if (error.code === '23505') {
        console.error("🚨 UNIQUE CONSTRAINT VIOLATION: User already exists");
      }
      if (error.code === '23503') {
        console.error("🚨 FOREIGN KEY CONSTRAINT VIOLATION: Referenced user doesn't exist in auth.users");
      }
      
      return false;
    }

    console.log("✅ User profile created successfully!");
    console.log("✅ Inserted data:", insertResult);
    return true;
  } catch (error) {
    console.error("❌ Exception during user profile creation:", error);
    console.error("❌ Exception stack:", (error as Error).stack);
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
      profilepicture: "",
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
      isverified: false,
      age: null,
      bio: "",
      location: "",
      area: "",
      budget: null,
      universityaffiliation: "",
      professionalstatus: "",
      preferences: {
        smoking: false,
        drinking: false,
        vegetarian: false,
        pets: false,
      },
      usertype: null,
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