// components/DebugInfo.tsx
"use client"

import { useAuth } from '@/hooks/useAuth';

export default function DebugInfo() {
  const { user, loading, error } = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs font-mono max-w-sm z-50">
      <div className="font-bold mb-2">DEBUG INFO</div>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>User: {user ? 'logged in' : 'not logged in'}</div>
      <div>Error: {error || 'none'}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
} 