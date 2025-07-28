// hooks/useAuth.ts - Fixed with proper user flow
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { User } from "@/types/user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check Firebase configuration on mount
  useEffect(() => {
    try {
      console.log("🔍 Firebase Auth Config Check:");
      console.log("- Auth instance:", !!auth);
      console.log("- API Key:", auth.app.options.apiKey ? "✅ Present" : "❌ Missing");
      console.log("- Auth Domain:", auth.app.options.authDomain || "❌ Missing");
      console.log("- Project ID:", auth.app.options.projectId || "❌ Missing");
      
      if (!auth.app.options.apiKey || !auth.app.options.authDomain || !auth.app.options.projectId) {
        throw new Error("Firebase configuration is incomplete. Check your .env.local file.");
      }
    } catch (configError) {
      console.error("❌ Firebase configuration error:", configError);
      setError(configError instanceof Error ? configError.message : "Firebase configuration error");
      setLoading(false);
      return;
    }

    // Set up auth state listener only if config is valid
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("🔄 Auth state changed:", firebaseUser ? `User: ${firebaseUser.uid}` : "No user");
      
      try {
        if (firebaseUser) {
          // Get user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          const profileData = userDoc.exists() ? userDoc.data() : null;
          
          console.log("📊 Profile data from Firestore:", profileData);
          
          const userData: User = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: profileData?.name || firebaseUser.displayName || "",
            profilePicture: profileData?.profilePicture || firebaseUser.photoURL || "",
            age: profileData?.age || null,
            bio: profileData?.bio || "",
            location: profileData?.location || "",
            budget: profileData?.budget || null,
            preferences: profileData?.preferences || null,
            userType: profileData?.userType || null,
            createdAt: profileData?.createdAt,
            updatedAt: profileData?.updatedAt,
          };
          
          setUser(userData);
          console.log("✅ User state updated:", userData);
        } else {
          setUser(null);
          console.log("✅ User state cleared");
        }
      } catch (firestoreError) {
        console.error("❌ Error loading user profile:", firestoreError);
        // Set basic user data as fallback
        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || "",
            profilePicture: firebaseUser.photoURL || "",
          });
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const emailSignUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Starting email signup for:", email);

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log("✅ User created in Firebase Auth:", firebaseUser.uid);

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: name,
      });
      
      console.log("✅ Firebase Auth profile updated");

      // Create user document in Firestore with minimal required data
      const userDoc = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: email,
        name: name,
        profilePicture: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add these default values
        age: null,
        preferences: null,
        userType: null,
        bio: "",
        location: "",
        budget: 0,
        lifestyle: {}
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
      
      // The auth state listener will automatically update the user state
      
    } catch (error: any) {
      console.error("❌ Email signup error:", error);
      setLoading(false);
      
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
            errorMessage = "Firebase configuration error. Please check your environment variables.";
            break;
          case 'auth/invalid-api-key':
            errorMessage = "Invalid Firebase API key. Please check your configuration.";
            break;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const emailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Starting email signin for:", email);
      
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Email signin successful");
      
      // The auth state listener will handle updating user state
      
    } catch (error: any) {
      console.error("❌ Email signin error:", error);
      setLoading(false);
      
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
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const googleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Starting Google signin...");
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      console.log("✅ Google signin successful:", firebaseUser.uid);
      
      // Check if user document exists, create if not
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document for new Google users
        const userDocData = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          profilePicture: firebaseUser.photoURL || "",
          createdAt: new Date(),
          updatedAt: new Date(),
          // Profile setup will be required
          age: null,
          bio: "",
          location: "",
          budget: null,
          preferences: null,
          userType: null,
        };

        await setDoc(userDocRef, userDocData);
        console.log("✅ New Google user document created");
      }
      
      // The auth state listener will handle updating user state
      
    } catch (error: any) {
      console.error("❌ Google signin error:", error);
      setLoading(false);
      
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
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("✅ User signed out");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw error;
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