// /app/api/test/supabase-debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {} as Record<string, any>,
    supabase: {} as Record<string, any>,
    connections: {} as Record<string, any>,
    errors: [] as string[],
    warnings: [] as string[],
    status: 'checking...' as string
  };

  try {
    console.log('🔍 Starting Supabase Debug...');

    // 1. Check Environment Variables
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      results.environment[varName] = {
        exists: !!value,
        length: value ? value.length : 0,
        preview: value ? `${value.substring(0, 20)}...` : 'Missing'
      };

      if (!value) {
        results.errors.push(`❌ Missing: ${varName}`);
      }
    });

    // 2. Test Supabase Client Initialization
    try {
      const supabase = initializeSupabase();
      results.supabase.client_init = '✅ Success';
      
      // Test database connection
      try {
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        if (error) {
          results.connections.database = `❌ ${error.message}`;
          results.errors.push(`Database: ${error.message}`);
        } else {
          results.connections.database = '✅ Connected and working perfectly!';
        }
      } catch (dbError: any) {
        results.connections.database = `❌ ${dbError.message}`;
        results.errors.push(`Database: ${dbError.message}`);
      }

      // Test Auth
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          results.connections.auth = `❌ ${error.message}`;
          results.errors.push(`Auth: ${error.message}`);
        } else {
          results.connections.auth = '✅ Initialized and ready';
        }
      } catch (authError: any) {
        results.connections.auth = `❌ ${authError.message}`;
        results.errors.push(`Auth: ${authError.message}`);
      }

    } catch (clientError: any) {
      results.supabase.client_init = `❌ ${clientError.message}`;
      results.errors.push(`Supabase Client: ${clientError.message}`);
    }

    // 3. Set final status
    if (results.errors.length === 0) {
      results.status = '🎉 Supabase is working perfectly!';
    } else {
      results.status = `❌ ${results.errors.length} error(s) found`;
    }

    return NextResponse.json({
      ...results,
      success_message: results.errors.length === 0 ? 
        '🎉 Your Supabase integration is working perfectly! You can now use the database and Auth in your app.' : 
        undefined,
      next_steps: results.errors.length === 0 ? [
        '✅ Supabase Client: Working',
        '✅ Database: Connected', 
        '✅ Auth: Ready',
        '🚀 You can now build your app features!'
      ] : [
        'Fix any remaining errors above',
        'Check Supabase Console settings',
        'Verify RLS policies if needed'
      ],
      test_endpoints: {
        database_write: 'POST /api/test (test writing to database)',
        auth_test: 'Use client-side auth with Supabase'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      help: 'This is a fatal error. Check your environment variables and Supabase setup.'
    }, { status: 500 });
  }
}

// Test database write operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test database write
    const supabase = initializeSupabase();
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: 'test-user-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: '🎉 Supabase database write test successful!',
      user_id: data.id,
      table: 'users',
      timestamp: new Date().toISOString(),
      next_steps: [
        'Your Supabase integration is fully working!',
        'You can now build your chat, user management, and other features',
        'Check Supabase Console to see the test record created'
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      help: 'Write test failed - check database RLS policies'
    }, { status: 500 });
  }
}