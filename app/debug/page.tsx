"use client"

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { debugDatabaseConnection, debugUserProfile, debugTableExists } from '@/lib/debug';

export default function DebugPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebugTests = async () => {
    setLoading(true);
    const debugResults: any = {};

    try {
      // Test 1: Database connection
      console.log('🧪 Test 1: Database Connection');
      debugResults.connection = await debugDatabaseConnection();

      // Test 2: Check if users table exists
      console.log('🧪 Test 2: Users Table Check');
      debugResults.tableExists = await debugTableExists('users');

      // Test 3: User profile (if user is logged in)
      if (user) {
        console.log('🧪 Test 3: User Profile Check');
        debugResults.userProfile = await debugUserProfile(user.id);
      }

      setResults(debugResults);
    } catch (error) {
      console.error('❌ Debug tests failed:', error);
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex flex-col">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b-4 border-[#004D40] bg-[#004D40]">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#44C76F] border-4 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[4px_4px_0px_0px_#F2F5F1]">
            <span className="text-[#004D40] font-black text-xl transform -rotate-3">R</span>
          </div>
          <span className="font-black text-2xl tracking-tight transform -skew-x-6 text-[#F2F5F1]">ROOMIO</span>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-[#004D40] mb-4 transform -skew-x-2">
              DATABASE DEBUG
            </h1>
            <div className="w-24 h-2 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            <p className="text-lg font-bold text-[#004D40]">
              Debug database connection and user profile issues
            </p>
          </div>

          <div className="bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-8 mb-8">
            <h2 className="text-2xl font-black text-[#004D40] mb-4">User Information</h2>
            <div className="text-sm font-bold text-[#004D40] space-y-2">
              <p>Authenticated: {user ? 'Yes' : 'No'}</p>
              {user && (
                <>
                  <p>User ID: {user.id}</p>
                  <p>Email: {user.email}</p>
                  <p>Name: {user.name}</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-8 mb-8">
            <h2 className="text-2xl font-black text-[#004D40] mb-4">Debug Tests</h2>
            
            <button
              onClick={runDebugTests}
              disabled={loading}
              className="bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black text-lg py-4 px-6 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all disabled:opacity-50 mb-6"
            >
              {loading ? 'RUNNING TESTS...' : 'RUN DEBUG TESTS'}
            </button>

            {Object.keys(results).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-[#004D40]">Test Results:</h3>
                
                {results.connection && (
                  <div className={`p-4 border-2 rounded ${results.connection.success ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}>
                    <h4 className="font-black mb-2">Database Connection</h4>
                    <pre className="text-sm font-bold">
                      {JSON.stringify(results.connection, null, 2)}
                    </pre>
                  </div>
                )}

                {results.tableExists && (
                  <div className={`p-4 border-2 rounded ${results.tableExists.exists ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}>
                    <h4 className="font-black mb-2">Users Table Check</h4>
                    <pre className="text-sm font-bold">
                      {JSON.stringify(results.tableExists, null, 2)}
                    </pre>
                  </div>
                )}

                {results.userProfile && (
                  <div className={`p-4 border-2 rounded ${results.userProfile.success ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}>
                    <h4 className="font-black mb-2">User Profile Check</h4>
                    <pre className="text-sm font-bold">
                      {JSON.stringify(results.userProfile, null, 2)}
                    </pre>
                  </div>
                )}

                {results.error && (
                  <div className="p-4 bg-red-100 border-2 border-red-500 rounded">
                    <h4 className="font-black text-red-700 mb-2">Error</h4>
                    <pre className="text-sm font-bold text-red-700">
                      {results.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-8">
            <h2 className="text-2xl font-black text-[#004D40] mb-4">Next Steps</h2>
            <div className="text-sm font-bold text-[#004D40] space-y-2">
              <p>1. Run the debug tests above</p>
              <p>2. If table doesn't exist, run the SQL setup script</p>
              <p>3. Check Supabase dashboard for table creation</p>
              <p>4. Verify RLS policies are set up correctly</p>
              <p>5. Test profile setup again</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 