// services/firestore.ts
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, DocumentData } from "firebase/firestore";

export async function getUserProfile(uid: string): Promise<DocumentData | null> {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

export async function updateUserProfile(uid: string, data: any): Promise<void> {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}