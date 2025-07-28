// services/auth.ts - Authentication service
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  profilePicture?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Sign up with email and password
export const signUpWithEmail = async (userData: CreateUserData) => {
  try {
    console.log('🔄 Starting sign up process...');
    
    // Test Firebase client setup first
    if (!auth || !db) {
      throw new Error('Firebase services not initialized');
    }
    
    console.log('✅ Firebase services initialized');
    console.log('🔍 Auth domain:', auth.app.options.authDomain);
    console.log('🔍 Project ID:', auth.app.options.projectId);
    
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const user = userCredential.user;
    console.log('✅ User created in Firebase Auth:', user.uid);
    
    // Update the user's profile
    await updateProfile(user, {
      displayName: userData.name,
      photoURL: userData.profilePicture || null
    });
    
    console.log('✅ Profile updated');
    
    // Create user document in Firestore
    const userDoc = {
      id: user.uid,
      email: userData.email,
      name: userData.name,
      profilePicture: userData.profilePicture || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    console.log('✅ User document created in Firestore');
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    };
    
  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    // Type guard for AuthError
    if (error && typeof error === 'object' && 'code' in error) {
      const authError = error as AuthError;
      console.error('❌ Auth Error Code:', authError.code);
      console.error('❌ Auth Error Message:', authError.message);
      
      // Handle specific Firebase Auth errors
      switch (authError.code) {
        case 'auth/configuration-not-found':
          return {
            success: false,
            error: 'Firebase configuration is missing or invalid. Check your environment variables.',
            code: 'config-error'
          };
        case 'auth/invalid-api-key':
          return {
            success: false,
            error: 'Invalid Firebase API key. Check NEXT_PUBLIC_FIREBASE_API_KEY.',
            code: 'api-key-error'
          };
        case 'auth/email-already-in-use':
          return {
            success: false,
            error: 'An account with this email already exists.',
            code: 'email-exists'
          };
        case 'auth/weak-password':
          return {
            success: false,
            error: 'Password is too weak. Please use at least 6 characters.',
            code: 'weak-password'
          };
        case 'auth/invalid-email':
          return {
            success: false,
            error: 'Please enter a valid email address.',
            code: 'invalid-email'
          };
        default:
          return {
            success: false,
            error: authError.message,
            code: authError.code
          };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      code: 'unknown-error'
    };
  }
};

// Sign in with email and password
export const signInWithEmail = async (signInData: SignInData) => {
  try {
    console.log('🔄 Starting sign in process...');
    
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      signInData.email, 
      signInData.password
    );
    
    const user = userCredential.user;
    console.log('✅ User signed in:', user.uid);
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...userData
      }
    };
    
  } catch (error) {
    console.error('❌ Sign in error:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      const authError = error as AuthError;
      
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return {
            success: false,
            error: 'Invalid email or password.',
            code: 'invalid-credentials'
          };
        case 'auth/invalid-email':
          return {
            success: false,
            error: 'Please enter a valid email address.',
            code: 'invalid-email'
          };
        default:
          return {
            success: false,
            error: authError.message,
            code: authError.code
          };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign in failed',
      code: 'unknown-error'
    };
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('✅ User signed out');
    return { success: true };
  } catch (error) {
    console.error('❌ Sign out error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign out failed'
    };
  }
};  