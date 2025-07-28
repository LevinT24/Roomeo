// hooks/useAuth.ts - Enhanced version with better error handling
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { getUserProfile, updateUserProfile } from "@/services/firestore";
import { User } from "@/types/user";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check Firebase configuration on mount
  useEffect(() => {
    console.log("🔍 Firebase Auth Config Check:");
    console.log("- API Key:", auth.app.options.apiKey ? "✅ Present" : "❌ Missing");
    console.log("- Auth Domain:", auth.app.options.authDomain || "❌ Missing");
    console.log("- Project ID:", auth.app.options.projectId || "❌ Missing");
    
    if (!auth.app.options.apiKey || !auth.app.options.authDomain || !auth.app.options.projectId) {
      setError("Firebase configuration is incomplete. Check your environment variables.");
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    if (error) return; // Don't set up auth listener if config is broken

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("🔄 Auth state changed:", firebaseUser ? "User logged in" : "User logged out");
      
      if (firebaseUser) {
        try {
          console.log("📊 Loading user profile for:", firebaseUser.uid);
          const profile = await getUserProfile(firebaseUser.uid);
          console.log("📊 Profile loaded:", profile);
          
          const userData: User = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: profile?.name || firebaseUser.displayName || "",
            userType: profile?.userType,
            profilePicture: profile?.profilePicture || firebaseUser.photoURL || "",
            createdAt: profile?.createdAt,
            updatedAt: profile?.updatedAt,
            ...profile
          };
          
          setUser(userData);
          console.log("✅ User state updated:", userData);
        } catch (error) {
          console.error("❌ Error loading user profile:", error);
          // Fallback to basic user data
          setUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || "",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [error]);

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("✅ User signed out");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw error;
    }
  };

  const emailSignUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      console.log("🔄 Starting email signup...");

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log("✅ User created in Firebase Auth:", firebaseUser.uid);

      // Update the user's profile
      await updateProfile(firebaseUser, {
        displayName: name,
      });
      
      console.log("✅ Profile updated in Firebase Auth");

      // Create user document in Firestore
      const userDoc = {
        id: firebaseUser.uid,
        email: email,
        name: name,
        profilePicture: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add required fields for profile setup
        age: null,
        preferences: null,
        userType: null,
        bio: "",
        lifestyle: {}
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
      console.log("✅ User document created in Firestore with default values");
    } catch (error: any) {
      console.error("❌ Email signup error:", error);
      
      // Handle specific Firebase errors
      let errorMessage = "Signup failed. Please try again.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "An account with this email already exists.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password should be at least 6 characters.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection.";
            break;
          case 'auth/configuration-not-found':
            errorMessage = "Firebase configuration error. Please contact support.";
            break;
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const emailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("🔄 Starting email signin...");
      
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Email signin successful");
      
    } catch (error: any) {
      console.error("❌ Email signin error:", error);
      
      let errorMessage = "Sign in failed. Please try again.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = "Invalid email or password.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection.";
            break;
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      setLoading(true);
      console.log("🔄 Starting Google signin...");
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      console.log("✅ Google signin successful:", firebaseUser.uid);
      
      // Check if user document exists, create if not
      try {
        const existingProfile = await getUserProfile(firebaseUser.uid);
        
        if (!existingProfile) {
          // Create user document for new Google users
          const userDoc = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "",
            profilePicture: firebaseUser.photoURL || "",
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
          console.log("✅ New Google user document created");
        }
      } catch (firestoreError) {
        console.error("❌ Error handling Google user profile:", firestoreError);
        // Don't throw here - auth was successful
      }
      
    } catch (error: any) {
      console.error("❌ Google signin error:", error);
      
      let errorMessage = "Google sign in failed. Please try again.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = "Sign in was cancelled.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection.";
            break;
        }
      }
      
      throw new Error(errorMessage);
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
    googleSignIn 
  };
}