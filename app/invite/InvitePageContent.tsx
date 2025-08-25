"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface InvitePageContentProps {
  invite: {
    groupId: string;
    groupName: string;
    inviterName: string;
    status: string;
    expiresAt: string;
  };
  token: string;
}

export default function InvitePageContent({ invite, token }: InvitePageContentProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  const handleAcceptInvite = async () => {
    setIsAccepting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to the group page
        const message = data.alreadyMember ? 'already_member' : 'welcome';
        window.location.href = `/groups/${data.groupId}?msg=${message}`;
      } else {
        setError(data.error === 'AUTH_REQUIRED' ? 'Please log in first' : 'Failed to accept invite');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Invited!</h1>
          
          <p className="text-gray-600 mb-6">
            <strong>{invite.inviterName}</strong> invited you to join <strong>&quot;{invite.groupName}&quot;</strong> on Roomio.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvite}
              disabled={isAccepting}
              className="w-full"
            >
              {isAccepting ? 'Joining...' : 'Accept Invite & Join Group'}
            </Button>
            
            <a 
              href="/dashboard" 
              className="block w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Maybe Later
            </a>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            This invite expires on {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}