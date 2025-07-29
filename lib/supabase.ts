// lib/supabase.ts - Client-side Supabase configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzolweuvoyzyrzeozsxq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6b2x3ZXV2b3l6eXJ6ZW96c3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTg5MjUsImV4cCI6MjA2OTMzNDkyNX0.rm8C9aqUAhq1wAE3BZuEERZ0Mz3bYRFWNSOEws07s70'

// Debug: Log config to check if env vars are loaded
console.log('🔍 Supabase Config Check:', {
  url: !!supabaseUrl,
  anonKey: !!supabaseAnonKey,
});

// Check if all required config values are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey,
  });
  throw new Error('Missing Supabase configuration. Check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test function to verify client setup
export const testSupabaseClient = () => {
  console.log('🧪 Testing Supabase Client Setup...');
  
  try {
    console.log('✅ Supabase URL:', supabaseUrl);
    console.log('✅ Supabase Client:', !!supabase);
    
    return {
      success: true,
      url: supabaseUrl,
    };
  } catch (error) {
    console.error('❌ Supabase Client Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 