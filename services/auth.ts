// services/auth.ts - Authentication service
import { supabase } from '@/lib/supabase';

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  profilePicture?: string;
}

// Sign up with email and password
export const signUpWithEmail = async (userData: CreateUserData) => {
  try {
    console.log('🔄 Starting sign up process...');
    
    // Test Supabase client setup first
    if (!supabase) {
      throw new Error('Supabase services not initialized');
    }
    
    console.log('✅ Supabase services initialized');
    
    // Create user with email and password
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.name,
        }
      }
    });
    
    if (error) throw error;
    
    const user = data.user;
    console.log('✅ User created in Supabase Auth:', user?.id);
    
    // Create user document in Supabase
    if (user) {
      const userDoc = {
        id: user.id,
        email: userData.email,
        name: userData.name,
        profilePicture: userData.profilePicture || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const { error: profileError } = await supabase
        .from('users')
        .insert(userDoc);
      
      if (profileError) {
        console.error('❌ Error creating user profile:', profileError);
        throw profileError;
      }
      
      console.log('✅ User document created in Supabase');
    }
    
    return {
      success: true,
      user: {
        uid: user?.id,
        email: user?.email,
        displayName: user?.user_metadata?.full_name,
        photoURL: user?.user_metadata?.avatar_url
      }
    };
    
  } catch (error: any) {
    console.error('❌ Sign up error:', error);
    
    let errorMessage = "Sign up failed. Please try again.";
    
    if (error.message) {
      if (error.message.includes('already registered')) {
        errorMessage = "An account with this email already exists.";
      } else if (error.message.includes('password')) {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.message.includes('email')) {
        errorMessage = "Please enter a valid email address.";
      }
    }
    
    throw new Error(errorMessage);
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log('🔄 Starting sign in process...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    console.log('✅ Sign in successful:', data.user?.id);
    
    return {
      success: true,
      user: {
        uid: data.user?.id,
        email: data.user?.email,
        displayName: data.user?.user_metadata?.full_name,
        photoURL: data.user?.user_metadata?.avatar_url
      }
    };
    
  } catch (error: any) {
    console.error('❌ Sign in error:', error);
    
    let errorMessage = "Sign in failed. Please try again.";
    
    if (error.message) {
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password.";
      } else if (error.message.includes('email')) {
        errorMessage = "Please enter a valid email address.";
      }
    }
    
    throw new Error(errorMessage);
  }
};

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('✅ Sign out successful');
  } catch (error: any) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
};
