// hooks/useAuth.ts
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { getUserProfile } from "@/services/firestore";
import { User } from "@/types/user";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider 
} from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser({
            id: firebaseUser.uid, // Set id for component compatibility
            uid: firebaseUser.uid, // Keep uid for Firebase operations
            email: firebaseUser.email,
            name: profile?.name || firebaseUser.displayName || "", // Get name from profile or Firebase
            ...profile
          });
        } catch (error) {
          console.error("Error loading user profile:", error);
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
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const emailSignUp = async (email: string, password: string, name: string) => {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    // Save additional user data to Firestore here
  };

  const emailSignIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return { 
    user, 
    loading, 
    logout, 
    emailSignUp, 
    emailSignIn, 
    googleSignIn 
  };
}
