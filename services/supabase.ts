// services/supabase.ts
import { supabase } from "@/lib/supabase";

export async function getUserProfile(uid: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      console.error("Error getting user profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting user profile:", error);
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
    const { error } = await supabase
      .from('users')
      .insert(userData);

    if (error) {
      console.error("Error creating user profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating user profile:", error);
    return false;
  }
} 