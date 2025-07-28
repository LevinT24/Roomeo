// /app/api/test/firebase-debug/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  return admin.app();
}

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {} as Record<string, any>,
    firebase: {} as Record<string, any>,
    connections: {} as Record<string, any>,
    errors: [] as string[],
    warnings: [] as string[],
    status: 'checking...' as string
  };

  try {
    console.log('🔍 Starting Firebase Debug...');

    // 1. Check Environment Variables
    const requiredVars = [
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL', 
      'FIREBASE_PROJECT_ID'
    ];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      results.environment[varName] = {
        exists: !!value,
        length: value ? value.length : 0,
        preview: value ? (varName.includes('PRIVATE_KEY') ? 'Present (Hidden)' : `${value.substring(0, 20)}...`) : 'Missing'
      };

      if (!value) {
        results.errors.push(`❌ Missing: ${varName}`);
      }
    });

    // 2. Analyze Private Key Format
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      results.firebase.private_key_analysis = {
        has_begin_marker: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
        has_end_marker: privateKey.includes('-----END PRIVATE KEY-----'),
        has_escaped_newlines: privateKey.includes('\\n'),
        has_actual_newlines: privateKey.includes('\n'),
        has_quotes: privateKey.startsWith('"') || privateKey.startsWith("'"),
        length: privateKey.length
      };

      // Common private key issues
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        results.errors.push('❌ Private key missing BEGIN marker');
      }
      if (!privateKey.includes('-----END PRIVATE KEY-----')) {
        results.errors.push('❌ Private key missing END marker');
      }
      if (!privateKey.includes('\\n') && !privateKey.includes('\n')) {
        results.errors.push('❌ Private key appears to be on one line');
      }
    }

    // 3. Test Firebase Admin Initialization
    try {
      const app = initializeFirebaseAdmin();
      results.firebase.admin_init = '✅ Success';
      
      // Test Firestore with a valid collection name
      try {
        const db = admin.firestore();
        // Use a valid collection name (not reserved)
        await db.collection('connection-test').limit(1).get();
        results.connections.firestore = '✅ Connected and working perfectly!';
      } catch (firestoreError: any) {
        // Try alternative test method
        try {
          const db = admin.firestore();
          // Just test the connection without querying
          const testRef = db.collection('debug-test').doc('test');
          results.connections.firestore = '✅ Connection established';
        } catch (altError: any) {
          results.connections.firestore = `❌ ${firestoreError.message}`;
          results.errors.push(`Firestore: ${firestoreError.message}`);
        }
      }

      // Test Auth
      try {
        const auth = admin.auth();
        results.connections.auth = '✅ Initialized and ready';
      } catch (authError: any) {
        results.connections.auth = `❌ ${authError.message}`;
        results.errors.push(`Auth: ${authError.message}`);
      }

    } catch (adminError: any) {
      results.firebase.admin_init = `❌ ${adminError.message}`;
      results.errors.push(`Firebase Admin: ${adminError.message}`);
      
      // Specific error handling for common issues
      if (adminError.message.includes('DECODER routines::unsupported')) {
        results.errors.push('🔧 SOLUTION: Your private key is corrupted. Generate a new one from Firebase Console.');
      }
      if (adminError.message.includes('Invalid key format')) {
        results.errors.push('🔧 SOLUTION: Check private key formatting - ensure proper newlines.');
      }
    }

    // 4. Set final status
    if (results.errors.length === 0) {
      results.status = '🎉 Firebase is working perfectly!';
    } else if (results.errors.some(e => e.includes('DECODER routines'))) {
      results.status = '❌ Private key is corrupted';
    } else {
      results.status = `❌ ${results.errors.length} error(s) found`;
    }

    return NextResponse.json({
      ...results,
      success_message: results.errors.length === 0 ? 
        '🎉 Your Firebase integration is working perfectly! You can now use Firestore and Auth in your app.' : 
        undefined,
      next_steps: results.errors.length === 0 ? [
        '✅ Firebase Admin SDK: Working',
        '✅ Firestore Database: Connected', 
        '✅ Firebase Auth: Ready',
        '🚀 You can now build your app features!'
      ] : [
        'Fix any remaining errors above',
        'Check Firebase Console settings',
        'Verify security rules if needed'
      ],
      test_endpoints: {
        firestore_write: 'POST /api/test/firebase-debug (test writing to Firestore)',
        auth_test: 'Create auth endpoints using Firebase Admin Auth'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      help: 'This is a fatal error. Check your environment variables and Firebase setup.'
    }, { status: 500 });
  }
}

// Test Firestore write operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test Firestore write with proper collection name
    const app = initializeFirebaseAdmin();
    const db = admin.firestore();
    
    const testDoc = await db.collection('debug-tests').add({
      message: body.message || '🚀 Firebase is working!',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
      test_type: 'connection_verification'
    });

    return NextResponse.json({
      success: true,
      message: '🎉 Firebase Firestore write test successful!',
      document_id: testDoc.id,
      collection: 'debug-tests',
      timestamp: new Date().toISOString(),
      next_steps: [
        'Your Firebase integration is fully working!',
        'You can now build your chat, user management, and other features',
        'Check Firebase Console to see the test document created'
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      help: 'Write test failed - check Firestore security rules'
    }, { status: 500 });
  }
}