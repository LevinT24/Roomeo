//lib/storage.ts
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const uploadPhoto = async (file: File, userId: string) => {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const filename = `profile-${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${filename}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error("Image upload failed");
  }
};