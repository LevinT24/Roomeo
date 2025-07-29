// lib/supabase.ts - Client-side Supabase configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzolweuvoyzyrzeozsxq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6b2x3ZXV2b3l6eXJ6ZW96c3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTg5MjUsImV4cCI6MjA2OTMzNDkyNX0.rm8C9aqUAhq1wAE3BZuEERZ0Mz3bYRFWNSOEws07s70'

// Debug: Log config to check if env vars are loaded (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Supabase Config Check:', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey,
  });
}

// Check if all required config values are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey,
  });
  throw new Error('Missing Supabase configuration. Check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Test function to verify client setup
export const testSupabaseClient = async () => {
  console.log('🧪 Testing Supabase Client Setup...');
  
  try {
    console.log('✅ Supabase URL:', supabaseUrl);
    console.log('✅ Supabase Client:', !!supabase);
    
    // Test the connection with a simple query
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Supabase connection test warning:', error.message);
    }
    
    return {
      success: true,
      url: supabaseUrl,
      sessionCheck: !error
    };
  } catch (error) {
    console.error('❌ Supabase Client Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};