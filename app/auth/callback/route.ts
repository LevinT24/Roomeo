import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'recovery' for password reset
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/';

  console.log('🔄 Auth callback route hit:', { code: !!code, type, error });

  // Handle errors first
  if (error) {
    console.error('❌ Auth callback error:', error, errorDescription);
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`);
  }

  // Handle password recovery flow
  if (type === 'recovery' && code) {
    console.log('🔑 Password recovery callback detected');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component, ignore
            }
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('❌ Password recovery session exchange error:', error);
        return NextResponse.redirect(`${origin}/?error=${encodeURIComponent('Failed to verify reset link')}`);
      }

      console.log('✅ Password recovery session established');
      // Redirect to a password update page
      return NextResponse.redirect(`${origin}/auth/update-password`);
    } catch (err) {
      console.error('❌ Password recovery callback error:', err);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent('Password reset failed')}`);
    }
  }

  // Handle OAuth flow (existing logic)
  if (code) {
    console.log('🔄 OAuth callback with code detected');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component, ignore
            }
          },
        },
      }
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('❌ OAuth session exchange error:', error);
        return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
      }

      console.log('✅ OAuth session established');
      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error('❌ OAuth callback error:', err);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent('Authentication failed')}`);
    }
  }

  // For implicit flow (no code), just redirect back to the app
  console.log('✅ Implicit flow callback - redirecting to app');
  return NextResponse.redirect(`${origin}${next}`);
} 