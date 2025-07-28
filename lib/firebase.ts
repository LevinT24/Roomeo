// lib/firebase.ts - Fixed Firebase configuration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Check if running in browser environment
const isBrowser = typeof window !== 'undefined';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug configuration
console.log('🔍 Firebase Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  isBrowser,
  config: {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '❌ MISSING',
    authDomain: firebaseConfig.authDomain || '❌ MISSING',
    projectId: firebaseConfig.projectId || '❌ MISSING',
    storageBucket: firebaseConfig.storageBucket || '❌ MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId || '❌ MISSING',
    appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : '❌ MISSING',
  }
});

// Validate configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  const errorMessage = `Missing Firebase configuration: ${missingKeys.join(', ')}. Please check your .env.local file.`;
  console.error('❌', errorMessage);
  
  if (isBrowser) {
    // Show user-friendly error in browser
    alert(`Configuration Error: ${errorMessage}`);
  }
  
  throw new Error(errorMessage);
}

// Validate format of critical fields
if (firebaseConfig.authDomain && !firebaseConfig.authDomain.includes('.firebaseapp.com')) {
  console.warn('⚠️ Auth domain should end with .firebaseapp.com');
}

if (firebaseConfig.storageBucket && !firebaseConfig.storageBucket.includes('.appspot.com')) {
  console.warn('⚠️ Storage bucket should end with .appspot.com');
}

// Initialize Firebase
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized:', app.name);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Verify services are working
try {
  console.log('✅ Firebase Auth initialized for project:', auth.app.options.projectId);
  console.log('✅ Firestore initialized');
  console.log('✅ Storage initialized');
} catch (error) {
  console.error('❌ Service initialization failed:', error);
}

export default app;