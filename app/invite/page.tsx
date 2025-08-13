import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase';
import InvitePageContent from './InvitePageContent';

interface InvitePageProps {
  searchParams: { t?: string };
}

async function validateInviteAndGetUser(token: string) {
  const supabase = supabaseServer();
  
  // Validate the invite token
  const inviteResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/invites/${token}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  
  const inviteData = await inviteResponse.json();
  
  if (!inviteData.success) {
    return { invite: null, user: null, error: inviteData.error };
  }
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    return { invite: inviteData.invite, user: null, error: null };
  }
  
  return { invite: inviteData.invite, user, error: null };
}

async function checkUserProfile(userId: string) {
  const supabase = supabaseServer();
  
  const { data: profile, error } = await supabase
    .from('users')
    .select('display_name, user_type, housing_location')
    .eq('id', userId)
    .single();
  
  if (error) {
    return { isComplete: false };
  }
  
  // Check if profile is complete (customize based on your onboarding requirements)
  const isComplete = !!(profile.display_name && profile.user_type);
  
  return { isComplete, profile };
}

async function checkGroupMembership(userId: string, groupId: string) {
  const supabase = supabaseServer();
  
  const { data, error } = await supabase
    .from('expense_participants')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();
  
  return !error && !!data;
}

async function acceptInviteAndRedirect(token: string, userId: string, groupId: string) {
  try {
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/invites/${token}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      return `/groups/${groupId}?msg=${result.alreadyMember ? 'already_member' : 'welcome'}`;
    } else {
      return `/invite?t=${token}&error=${result.error}`;
    }
  } catch (error) {
    console.error('Error accepting invite:', error);
    return `/invite?t=${token}&error=ACCEPT_FAILED`;
  }
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const token = searchParams.t;
  
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invite</h1>
            <p className="text-gray-600 mb-6">
              This invite link is missing required information.
            </p>
            <a 
              href="/dashboard" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  const { invite, user, error } = await validateInviteAndGetUser(token);
  
  if (error) {
    let errorMessage = 'This invite link is invalid or has expired.';
    let canRetry = false;
    
    switch (error) {
      case 'EXPIRED':
        errorMessage = 'This invite has expired. Please ask for a new invite.';
        break;
      case 'ALREADY_ACCEPTED':
        errorMessage = 'This invite has already been used.';
        break;
      case 'TOKEN_NOT_FOUND':
        errorMessage = 'This invite link is invalid.';
        break;
      default:
        canRetry = true;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invite Error</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <div className="space-y-3">
              <a 
                href="/dashboard" 
                className="block w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Dashboard
              </a>
              {canRetry && (
                <button 
                  onClick={() => window.location.reload()} 
                  className="block w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    // User is not logged in - save token in cookie and redirect to auth
    const cookieStore = cookies();
    cookieStore.set('invite_token', token, { 
      maxAge: 3600, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    redirect(`/auth?redirect=invite&group=${encodeURIComponent(invite.groupName)}`);
  }
  
  // Check if user is already a member
  const isMember = await checkGroupMembership(user.id, invite.groupId);
  if (isMember) {
    redirect(`/groups/${invite.groupId}?msg=already_member`);
  }
  
  // Check if profile is complete
  const { isComplete, profile } = await checkUserProfile(user.id);
  
  if (!isComplete) {
    // Save token for after onboarding
    const cookieStore = cookies();
    cookieStore.set('invite_token', token, { 
      maxAge: 3600, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    redirect('/onboarding');
  }
  
  // Auto-accept invite and redirect
  const redirectUrl = await acceptInviteAndRedirect(token, user.id, invite.groupId);
  redirect(redirectUrl);
}

// Loading fallback component
function InvitePageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Processing Invite...</h1>
          <p className="text-gray-600">Please wait while we get you set up.</p>
        </div>
      </div>
    </div>
  );
}

// Wrap the page in Suspense for better loading states
export default function WrappedInvitePage({ searchParams }: InvitePageProps) {
  return (
    <Suspense fallback={<InvitePageLoading />}>
      <InvitePage searchParams={searchParams} />
    </Suspense>
  );
}