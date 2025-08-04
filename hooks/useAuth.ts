// hooks/useAuth.ts - Client-side only authentication
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, createFallbackUser } from "@/types/user";
import { getUserProfile, updateUserProfile, ensureUserProfile } from "@/services/supabase";
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUserSession = async (supabaseUser: SupabaseUser) => {
    // Prevent multiple simultaneous calls
    if (isProcessing) {
      console.log("⏳ Already processing user session, skipping...");
      return;
    }
    
    setIsProcessing(true);
    setLoading(true);
    setError(null);
    
    // Add timeout for user session processing  
    const sessionTimeout = setTimeout(() => {
      console.log("⚠️ User session processing timeout, forcing completion");
      setIsProcessing(false);
      setLoading(false);
      // Don't create fallback user here - let the profile loading logic handle it
    }, 10000);
    
    try {
      console.log("📊 Loading user profile for:", supabaseUser.id);
      const profile = await getUserProfile(supabaseUser.id);
      console.log("📊 Profile loaded:", profile);

      // If no profile exists, try to create one first, then fallback
      if (!profile) {
        console.log("📝 No profile found - attempting to create user profile");
        
        // Try to create a user profile in the database
        const profileCreated = await ensureUserProfile(
          supabaseUser.id,
          supabaseUser.email || "",
          supabaseUser.user_metadata?.full_name || ""
        );
        
        if (profileCreated) {
          console.log("✅ User profile created in database");
          // Try to fetch the profile again
          const newProfile = await getUserProfile(supabaseUser.id);
          if (newProfile) {
            const userData: User = {
              id: supabaseUser.id,
              uid: supabaseUser.id,
              email: supabaseUser.email ?? null,
              name: newProfile?.name || supabaseUser.user_metadata?.full_name || "",
              userType: newProfile?.usertype, // Fixed: use lowercase from database
              profilePicture:
                newProfile?.profilepicture || supabaseUser.user_metadata?.avatar_url || "", // Fixed: use lowercase
              createdAt: newProfile?.createdat, // Fixed: use lowercase
              updatedAt: newProfile?.updatedat, // Fixed: use lowercase
              age: newProfile?.age,
              bio: newProfile?.bio || "",
              location: newProfile?.location || "",
              budget: newProfile?.budget,
              preferences: newProfile?.preferences || {
                smoking: false,
                drinking: false,
                vegetarian: false,
                pets: false,
              },
            };
            setUser(userData);
            console.log("✅ User state updated with new profile");
            return;
          }
        }
        
        // Only create fallback user if profile creation completely failed
        console.log("📝 Profile creation failed - creating fallback user");
        const fallbackUser = createFallbackUser(supabaseUser);
        setUser(fallbackUser);
        console.log("✅ Fallback user created:", fallbackUser);
        return;
      }

      const userData: User = {
        id: supabaseUser.id,
        uid: supabaseUser.id,
        email: supabaseUser.email ?? null,
        name: profile?.name || supabaseUser.user_metadata?.full_name || "",
        userType: profile?.usertype, // Fixed: use lowercase from database
        profilePicture:
          profile?.profilepicture || supabaseUser.user_metadata?.avatar_url || "", // Fixed: use lowercase
        createdAt: profile?.createdat, // Fixed: use lowercase
        updatedAt: profile?.updatedat, // Fixed: use lowercase
        age: profile?.age,
        bio: profile?.bio || "",
        location: profile?.location || "",
        budget: profile?.budget,
        preferences: profile?.preferences || {
          smoking: false,
          drinking: false,
          vegetarian: false,
          pets: false,
        },
      };

      console.log("✅ Setting user state:", userData);
      setUser(userData);
      console.log("✅ User state updated successfully");
    } catch (error) {
      console.error("❌ Error loading user profile:", error);
      console.log("✅ Setting fallback user due to error");
      const fallbackUser = createFallbackUser(supabaseUser);
      setUser(fallbackUser);
      console.log("✅ Fallback user set:", fallbackUser);
    } finally {
      clearTimeout(sessionTimeout);
      setIsProcessing(false);
      setLoading(false);
    }
  };

  // Check Supabase configuration and set up auth listener
  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;
    
    console.log("🔍 Supabase Auth Config Check:");
    console.log("- Supabase client initialized:", !!supabase);

    if (!supabase) {
      setError("Supabase configuration is incomplete. Check your environment variables.");
      setLoading(false);
      return;
    }

    // Set a timeout to force loading to false after 12 seconds
    loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.log("⚠️ Auth loading timeout reached, forcing loading to false");
        setLoading(false);
        setIsProcessing(false);
      }
    }, 12000);

    const getInitialSession = async () => {
      try {
        console.log("🔄 Getting initial session...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("❌ Error getting initial session:", error);
          setError(error.message);
          setLoading(false);
          return;
        }

        console.log("✅ Initial session result:", session?.user ? "User found" : "No user");

        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
        }
        
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setLoading(false);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("❌ Error in getInitialSession:", err);
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setError("Failed to initialize authentication");
          setLoading(false);
          setIsProcessing(false);
        }
      }
    };

    getInitialSession();

    console.log("🔄 Setting up auth state listener...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;
        
        console.log("🔄 Auth state changed:", event, session?.user ? "User logged in" : "User logged out");

        try {
          if (session?.user) {
            await handleUserSession(session.user);
          } else {
            console.log("✅ Setting user to null (logged out)");
            setUser(null);
            setError(null); // Clear any previous errors when logging out
          }
          
          if (isMounted) {
            setLoading(false);
            setIsProcessing(false);
          }
        } catch (err) {
          console.error("❌ Error in auth state change handler:", err);
          
          if (isMounted) {
            setLoading(false);
            setIsProcessing(false);
            // Let the regular profile loading handle user creation
            // Don't create fallback users here as it might override real profile data
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      console.log("🧹 Cleaning up auth listener");
      subscription?.unsubscribe();
    };
  }, []);

  const updateProfilePicture = async (imageUrl: string) => {
    try {
      console.log("🔄 Updating profile picture:", imageUrl);

      if (!user?.id) {
        throw new Error("No user logged in");
      }

      const success = await updateUserProfile(user.id, {
        profilePicture: imageUrl,
      });

      if (success && user) {
        setUser({
          ...user,
          profilePicture: imageUrl,
          updatedAt: new Date(),
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
      setError(null);
      console.log("🔄 Starting email signup...", { email, name });

      // Debug: Check auth state before signup
      const { data: { session: beforeSession } } = await supabase.auth.getSession();
      console.log("🔍 Auth session before signup:", beforeSession?.user?.id || "No session");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        console.error("❌ Supabase Auth signup error:", error);
        throw error;
      }

      const supabaseUser = data.user;
      console.log("✅ User created in Supabase Auth:");
      console.log("   - User ID:", supabaseUser?.id);
      console.log("   - User email:", supabaseUser?.email);
      console.log("   - User confirmed:", supabaseUser?.email_confirmed_at ? "Yes" : "No");
      console.log("   - User metadata:", supabaseUser?.user_metadata);

      // Debug: Check auth state after signup
      const { data: { session: afterSession } } = await supabase.auth.getSession();
      console.log("🔍 Auth session after signup:", afterSession?.user?.id || "No session");
      console.log("🔍 Access token exists:", !!afterSession?.access_token);

      if (supabaseUser) {
        console.log("🔄 About to create user profile...");
        
        // Use the ensureUserProfile function to create the user profile
        const profileCreated = await ensureUserProfile(supabaseUser.id, email, name);
        
        if (!profileCreated) {
          console.error("❌ Error creating user profile");
          console.error("❌ This usually means RLS policies are blocking the insert");
          throw new Error("Failed to create user profile");
        }

        console.log("✅ User profile created in Supabase");
      } else {
        console.error("❌ No user returned from Supabase Auth signup");
      }

      console.log("✅ Email signup completed successfully");
    } catch (error: any) {
      console.error("❌ Email signup error:", error);
      console.error("❌ Error stack:", error.stack);
      setError(error.message || "Signup failed. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const emailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Starting email signin...", { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw error;
      }

      console.log("✅ Email signin successful:", data.user?.id);
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
      setError(null);
      console.log("🔄 Starting Google signin...");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      console.log("✅ Google signin initiated");
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