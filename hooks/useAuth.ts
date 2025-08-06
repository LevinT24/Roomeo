// hooks/useAuth.ts - Stable session management with persistence
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User, createFallbackUser } from "@/types/user";
import { getUserProfile, ensureUserProfile } from "@/services/supabase";
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  sessionValid: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    sessionValid: false
  });

  // Refs to prevent multiple simultaneous operations
  const isProcessingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout>();

  // Session recovery and validation
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("Session validation error:", error);
        return false;
      }

      if (!session || !session.user) {
        return false;
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        console.log("Session expired, attempting refresh...");
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.warn("Session refresh failed:", refreshError);
          return false;
        }
        
        return true;
      }

      return true;
    } catch (error) {
      console.error("Session validation failed:", error);
      return false;
    }
  }, []);

  // Load user profile with caching
  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User> => {
    try {
      console.log("Loading profile for user:", supabaseUser.id);
      
      // Try to get profile from database
      const profile = await getUserProfile(supabaseUser.id);
      
      if (profile) {
        return {
          id: supabaseUser.id,
          uid: supabaseUser.id,
          email: supabaseUser.email ?? null,
          name: profile.name || supabaseUser.user_metadata?.full_name || "",
          userType: profile.usertype,
          profilePicture: profile.profilepicture || supabaseUser.user_metadata?.avatar_url || "",
          createdAt: profile.createdat ? new Date(profile.createdat) : undefined,
          updatedAt: profile.updatedat ? new Date(profile.updatedat) : undefined,
          age: profile.age,
          bio: profile.bio || "",
          location: profile.location || "",
          budget: profile.budget,
          preferences: profile.preferences || {
            smoking: false,
            drinking: false,
            vegetarian: false,
            pets: false,
          },
        };
      }

      // If no profile exists, try to create one
      console.log("No profile found, creating one...");
      const profileCreated = await ensureUserProfile(
        supabaseUser.id,
        supabaseUser.email || "",
        supabaseUser.user_metadata?.full_name || ""
      );
      
      if (profileCreated) {
        // Try to fetch the new profile
        const newProfile = await getUserProfile(supabaseUser.id);
        if (newProfile) {
          return {
            id: supabaseUser.id,
            uid: supabaseUser.id,
            email: supabaseUser.email ?? null,
            name: newProfile.name || supabaseUser.user_metadata?.full_name || "",
            userType: newProfile.usertype,
            profilePicture: newProfile.profilepicture || supabaseUser.user_metadata?.avatar_url || "",
            createdAt: newProfile.createdat ? new Date(newProfile.createdat) : undefined,
            updatedAt: newProfile.updatedat ? new Date(newProfile.updatedat) : undefined,
            age: newProfile.age,
            bio: newProfile.bio || "",
            location: newProfile.location || "",
            budget: newProfile.budget,
            preferences: newProfile.preferences || {
              smoking: false,
              drinking: false,
              vegetarian: false,
              pets: false,
            },
          };
        }
      }

      // Fallback to basic user data
      console.log("Using fallback user data");
      return createFallbackUser(supabaseUser);

    } catch (error) {
      console.error("Error loading user profile:", error);
      return createFallbackUser(supabaseUser);
    }
  }, []);

  // Handle session changes
  const handleSessionChange = useCallback(async (session: Session | null) => {
    // Prevent multiple simultaneous processing
    if (isProcessingRef.current) {
      console.log("Session change already in progress, skipping...");
      return;
    }

    isProcessingRef.current = true;

    try {
      if (session?.user) {
        // Skip if same user to prevent unnecessary updates
        if (lastUserIdRef.current === session.user.id) {
          console.log("Same user, skipping profile reload");
          setState(prev => ({ ...prev, loading: false, sessionValid: true }));
          return;
        }

        console.log("Loading user profile for session change:", session.user.id);
        lastUserIdRef.current = session.user.id;

        const userData = await loadUserProfile(session.user);
        
        setState({
          user: userData,
          loading: false,
          error: null,
          sessionValid: true
        });

        console.log("User session established:", userData.id);
      } else {
        // No session - clear user data
        console.log("No session, clearing user data");
        lastUserIdRef.current = null;
        
        setState({
          user: null,
          loading: false,
          error: null,
          sessionValid: false
        });
      }
    } catch (error) {
      console.error("Error handling session change:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Failed to load user session"
      }));
    } finally {
      isProcessingRef.current = false;
    }
  }, [loadUserProfile]);

  // Initialize auth and set up listeners
  useEffect(() => {
    let mounted = true;
    let authSubscription: { data: { subscription: any } } | null = null;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting initial session:", error);
          if (mounted) {
            setState(prev => ({ 
              ...prev, 
              loading: false, 
              error: error.message 
            }));
          }
          return;
        }

        // Handle initial session
        if (mounted) {
          await handleSessionChange(session);
        }

        // Set up auth state listener
        authSubscription = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            if (!mounted) return;

            console.log("Auth state changed:", event, session?.user ? "User present" : "No user");

            // Handle different auth events
            switch (event) {
              case 'SIGNED_IN':
              case 'TOKEN_REFRESHED':
                await handleSessionChange(session);
                break;
              case 'SIGNED_OUT':
                await handleSessionChange(null);
                break;
              case 'USER_UPDATED':
                if (session?.user) {
                  await handleSessionChange(session);
                }
                break;
              default:
                console.log("Unhandled auth event:", event);
            }
          }
        );

        console.log("Auth listener set up successfully");

      } catch (error) {
        console.error("Auth initialization failed:", error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: "Authentication initialization failed"
          }));
        }
      }
    };

    // Set loading timeout
    sessionTimeoutRef.current = setTimeout(() => {
      if (mounted && state.loading) {
        console.log("Auth loading timeout reached");
        setState(prev => ({ ...prev, loading: false }));
      }
    }, 15000);

    initializeAuth();

    // Cleanup
    return () => {
      mounted = false;
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once

  // Session recovery for focus/visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && state.user) {
        console.log("App became visible, validating session...");
        
        const isValid = await validateSession();
        
        if (!isValid) {
          console.log("Session invalid, clearing user data");
          setState(prev => ({
            ...prev,
            user: null,
            sessionValid: false,
            error: "Session expired"
          }));
        } else {
          console.log("Session valid");
          setState(prev => ({ ...prev, sessionValid: true }));
        }
      }
    };

    const handleFocus = async () => {
      if (state.user) {
        await handleVisibilityChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [state.user, validateSession]);

  // Auth actions
  const logout = useCallback(async () => {
    try {
      console.log("Logging out user...");
      isProcessingRef.current = true;
      
      setState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  const emailSignUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      console.log("Starting email signup...", { email, name });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      console.log("Signup successful:", data.user?.id);
      
    } catch (error: any) {
      console.error("Signup error:", error);
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const emailSignIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      console.log("Starting email signin...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw error;
      }

      console.log("Signin successful:", data.user?.id);
      
    } catch (error: any) {
      console.error("Signin error:", error);
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const googleSignIn = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      console.log("Starting Google signin...");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      console.log("Google signin initiated");
      
    } catch (error: any) {
      console.error("Google signin error:", error);
      setState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  }, []);

  const updateProfilePicture = useCallback(async (imageUrl: string) => {
    if (!state.user?.id) {
      throw new Error("No user logged in");
    }

    try {
      console.log("Updating profile picture:", imageUrl);

      // Update in database (handled by updateUserProfile service)
      // Just update local state for immediate UI feedback
      setState(prev => ({
        ...prev,
        user: prev.user ? {
          ...prev.user,
          profilePicture: imageUrl,
          updatedAt: new Date(),
        } : null
      }));

      console.log("Profile picture updated successfully");
    } catch (error) {
      console.error("Error updating profile picture:", error);
      throw error;
    }
  }, [state.user?.id]);

  // Session refresh utility
  const refreshSession = useCallback(async () => {
    try {
      console.log("Manually refreshing session...");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      console.log("Session refreshed successfully");
      return true;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    sessionValid: state.sessionValid,
    logout,
    emailSignUp,
    emailSignIn,
    googleSignIn,
    updateProfilePicture,
    refreshSession,
    validateSession
  };
}