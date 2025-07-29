// hooks/useAuth.ts - Client-side only authentication
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types/user";
import { getUserProfile, updateUserProfile } from "@/services/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check Supabase configuration on mount
  useEffect(() => {
    console.log("🔍 Supabase Auth Config Check:");
    console.log("- Supabase client initialized:", !!supabase);
    
    if (!supabase) {
      setError("Supabase configuration is incomplete. Check your environment variables.");
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    if (error) return; // Don't set up auth listener if config is broken

    console.log("🔄 Setting up auth state listener...");
    
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("❌ Error getting initial session:", error);
        setError(error.message);
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        await handleUserSession(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state changed:", event, session?.user ? "User logged in" : "User logged out");
        
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          console.log("✅ Setting user to null (logged out)");
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [error]);

  const handleUserSession = async (supabaseUser: any) => {
    try {
      console.log("📊 Loading user profile for:", supabaseUser.id);
      const profile = await getUserProfile(supabaseUser.id);
      console.log("📊 Profile loaded:", profile);
      
      const userData: User = {
        id: supabaseUser.id,
        uid: supabaseUser.id,
        email: supabaseUser.email,
        name: profile?.name || supabaseUser.user_metadata?.full_name || "",
        userType: profile?.userType,
        profilePicture: profile?.profilePicture || supabaseUser.user_metadata?.avatar_url || "",
        createdAt: profile?.createdAt,
        updatedAt: profile?.updatedAt,
        ...profile
      };
      
      console.log("✅ Setting user state:", userData);
      setUser(userData);
      console.log("✅ User state updated successfully");
    } catch (error) {
      console.error("❌ Error loading user profile:", error);
      // Fallback to basic user data
      const fallbackUser = {
        id: supabaseUser.id,
        uid: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || "",
      };
      console.log("✅ Setting fallback user:", fallbackUser);
      setUser(fallbackUser);
    }
  };

  const updateProfilePicture = async (imageUrl: string) => {
    try {
      console.log("🔄 Updating profile picture:", imageUrl);
      
      const success = await updateUserProfile(user?.id || "", {
        profilePicture: imageUrl
      });

      if (success && user) {
        // Update local user state
        setUser({
          ...user,
          profilePicture: imageUrl,
          updatedAt: new Date()
        });
        console.log("✅ Profile picture updated successfully");
      } else {
        throw new Error("Failed to update profile picture");
      }
    } catch (error) {
      console.error("❌ Error updating profile picture:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log("🔄 Logging out user...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log("✅ User signed out");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw error;
    }
  };

  const emailSignUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      console.log("🔄 Starting email signup...", { email, name });

      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) throw error;
      
      const supabaseUser = data.user;
      console.log("✅ User created in Supabase Auth:", supabaseUser?.id);

      // Create user document in Supabase
      if (supabaseUser) {
        const userDoc = {
          id: supabaseUser.id,
          uid: supabaseUser.id,
          email: email,
          name: name,
          profilePicture: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          isVerified: false,
          // Add required fields for profile setup
          age: null,
          bio: "",
          location: "",
          budget: null,
          preferences: null,
          userType: null,
          lifestyle: {}
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert(userDoc);

        if (profileError) {
          console.error("❌ Error creating user profile:", profileError);
          throw profileError;
        }

        console.log("✅ User document created in Supabase");
      }
      
      // The auth state listener will automatically update the user state
      console.log("✅ Email signup completed successfully");
    } catch (error: any) {
      console.error("❌ Email signup error:", error);
      setError(error.message || "Signup failed. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const emailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("🔄 Starting email signin...", { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      const supabaseUser = data.user;
      console.log("✅ Email signin successful:", supabaseUser?.id);
      
      // The auth state listener will automatically update the user state
      console.log("✅ Email signin completed successfully");
    } catch (error: any) {
      console.error("❌ Email signin error:", error);
      setError(error.message || "Signin failed. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      setLoading(true);
      console.log("🔄 Starting Google signin...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      
      console.log("✅ Google signin initiated");
      console.log("✅ Google signin completed successfully");
      
      // The auth state listener will handle the user session after OAuth redirect
    } catch (error: any) {
      console.error("❌ Google signin error:", error);
      setError(error.message || "Google signin failed. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    logout,
    emailSignUp,
    emailSignIn,
    googleSignIn,
    updateProfilePicture,
  };
}