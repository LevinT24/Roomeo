// lib/supabase.ts - Enhanced client-side Supabase configuration with robust session management
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Enhanced session storage wrapper
class SupabaseStorage {
  private storageKey = 'supabase.auth.token'
  private fallbackData: any = null

  getItem(key: string): string | null {
    try {
      // Try localStorage first (primary storage)
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key)
        if (item) {
          // Validate the stored data
          try {
            const parsed = JSON.parse(item)
            if (parsed && parsed.access_token && parsed.refresh_token) {
              return item
            }
          } catch {
            // Invalid JSON, remove it
            window.localStorage.removeItem(key)
          }
        }
      }

      // Fallback to sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key)
      }

      // Final fallback to in-memory storage
      return this.fallbackData ? JSON.stringify(this.fallbackData) : null
    } catch (error) {
      console.warn('Session storage getItem failed:', error)
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      // Validate the value before storing
      try {
        const parsed = JSON.parse(value)
        if (!parsed || !parsed.access_token) {
          console.warn('Invalid session data, not storing')
          return
        }
      } catch {
        console.warn('Invalid JSON session data')
        return
      }

      // Store in localStorage (primary)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value)
      }

      // Also store in sessionStorage (backup)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value)
      }

      // Update fallback
      try {
        this.fallbackData = JSON.parse(value)
      } catch {
        // Ignore parsing errors for fallback
      }
    } catch (error) {
      console.warn('Session storage setItem failed:', error)
      // Store in fallback
      try {
        this.fallbackData = JSON.parse(value)
      } catch {
        // Ignore parsing errors
      }
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key)
      }
      this.fallbackData = null
    } catch (error) {
      console.warn('Session storage removeItem failed:', error)
      this.fallbackData = null
    }
  }
}

const customStorage = new SupabaseStorage()

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

// Create Supabase client with enhanced session management
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable session persistence across browser restarts
    persistSession: true,
    
    // Use custom storage wrapper for better reliability
    storage: customStorage,
    
    // Enable automatic token refresh to prevent session expiration
    autoRefreshToken: true,
    
    // Detect session in URL (for OAuth callbacks)
    detectSessionInUrl: true,
    
    // Flow type for PKCE (more secure)
    flowType: 'pkce',
    
    // Debug logging in development
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Global options
  global: {
    // Add request headers for better debugging
    headers: {
      'X-Client-Info': 'roomio-web-app'
    }
  },
  
  // Realtime options for better connection handling
  realtime: {
    // Enhanced heartbeat for connection health
    heartbeatIntervalMs: 30000,
    
    // More aggressive reconnection
    reconnectAfterMs: (tries: number) => {
      return Math.min(tries * 1000, 10000)
    }
    
    // Removed maxReconnectAttempts as it's not a valid Supabase realtime option
    // Removed the problematic logger property
    // The Supabase realtime client will use its default logging and reconnection logic
  }
})

// Enhanced session validation
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('Session validation error:', error)
      return false
    }

    if (!session || !session.user) {
      return false
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired, attempting refresh...')
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !refreshData.session) {
        console.warn('Session refresh failed:', refreshError)
        return false
      }
      
      return true
    }

    return true
  } catch (error) {
    console.error('Session validation failed:', error)
    return false
  }
}

// Session recovery utilities
export const sessionUtils = {
  // Get current session with error handling
  getCurrentSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      return { session, error }
    } catch (error) {
      console.error('Failed to get current session:', error)
      return { session: null, error }
    }
  },

  // Refresh session manually
  refreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      return { success: true, session: data.session }
    } catch (error) {
      console.error('Session refresh failed:', error)
      return { success: false, error }
    }
  },

  // Clear session completely
  clearSession: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Also clear storage manually
      customStorage.removeItem('supabase.auth.token')
      
      return { success: true }
    } catch (error) {
      console.error('Session clear failed:', error)
      return { success: false, error }
    }
  },

  // Check session health
  checkSessionHealth: async () => {
    const { session, error } = await sessionUtils.getCurrentSession()
    
    if (!session) {
      return { healthy: false, reason: 'No session' }
    }

    if (error) {
      return { healthy: false, reason: error.message }
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now + 300) { // 5 minutes buffer
      return { healthy: false, reason: 'Session expiring soon' }
    }

    return { healthy: true, session }
  }
}

// Auto-recovery system
export const autoRecovery = {
  // Attempt to recover session automatically
  recoverSession: async () => {
    console.log('🔄 Attempting automatic session recovery...')

    try {
      // Check if session exists but is invalid
      const { session, error } = await sessionUtils.getCurrentSession()
      
      if (!session) {
        return { 
          success: false, 
          action: 'no_session',
          error: 'No session found' 
        }
      }

      if (error) {
        console.log('Session error detected, attempting refresh...')
        const refreshResult = await sessionUtils.refreshSession()
        
        if (refreshResult.success) {
          return { 
            success: true, 
            action: 'refresh_success',
            session: refreshResult.session 
          }
        } else {
          return { 
            success: false, 
            action: 'refresh_failed',
            error: refreshResult.error 
          }
        }
      }

      // Session exists and no errors
      const isValid = await validateSession()
      
      if (isValid) {
        return { 
          success: true, 
          action: 'session_valid',
          session 
        }
      } else {
        return { 
          success: false, 
          action: 'session_invalid',
          error: 'Session validation failed' 
        }
      }

    } catch (error) {
      console.error('Auto recovery failed:', error)
      return { 
        success: false, 
        action: 'connection_failed',
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Connection health monitoring
export const connectionMonitor = {
  // Check if Supabase is reachable
  checkConnection: async () => {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      return { connected: !error, error }
    } catch (error) {
      return { connected: false, error }
    }
  },

  // Monitor connection with callback
  startMonitoring: (onConnectionChange: (connected: boolean) => void) => {
    let lastConnectionState = true
    
    const checkInterval = setInterval(async () => {
      const { connected } = await connectionMonitor.checkConnection()
      
      if (connected !== lastConnectionState) {
        lastConnectionState = connected
        onConnectionChange(connected)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(checkInterval)
  }
}

// Server-side Supabase client for API routes
export function supabaseServer(serviceRoleKey?: string) {
  const cookieStore = cookies();
  
  // If service role key is provided, use it for admin operations
  if (serviceRoleKey) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op for service role
          },
        },
      }
    );
  }
  
  // Regular authenticated client
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

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
    
    // Test session utilities
    const sessionHealth = await sessionUtils.checkSessionHealth()
    
    return {
      success: true,
      url: supabaseUrl,
      sessionCheck: !error,
      sessionHealth
    };
  } catch (error) {
    console.error('❌ Supabase Client Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};