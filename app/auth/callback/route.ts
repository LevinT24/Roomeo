import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';

  console.log('✅ OAuth callback route hit - implicit flow');
  console.log('Redirecting to:', `${origin}${next}`);
  
  // For implicit flow, just redirect back to the app
  // The client-side Supabase client will handle the token extraction from URL fragments
  return NextResponse.redirect(`${origin}${next}`);
} 