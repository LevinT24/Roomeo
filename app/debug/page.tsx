// app/debug/page.tsx - Debug page for testing Supabase functionality
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { testSupabaseClient } from "@/lib/supabase"
import { testStorageConnection, uploadImage, checkBucketExists } from "@/lib/storage"
import { getUserProfile, ensureUserProfile } from "@/services/supabase"
import { useAuth } from "@/hooks/useAuth"

export default function DebugPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(testName)
    try {
      const result = await testFn()
      setResults(prev => ({ ...prev, [testName]: result }))
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }))
    } finally {
      setLoading(null)
    }
  }

  const testSupabaseConnection = () => runTest('supabase', testSupabaseClient)
  const testStorage = () => runTest('storage', testStorageConnection)
  const testBucketExists = () => runTest('bucket', () => checkBucketExists('avatars'))
  
  const testUserProfile = async () => {
    if (!user) {
      setResults(prev => ({ 
        ...prev, 
        profile: { success: false, error: 'No user logged in' } 
      }))
      return
    }
    await runTest('profile', () => getUserProfile(user.id))
  }

  const testEnsureProfile = async () => {
    if (!user) {
      setResults(prev => ({ 
        ...prev, 
        ensureProfile: { success: false, error: 'No user logged in' } 
      }))
      return
    }
    await runTest('ensureProfile', () => ensureUserProfile(user.id, user.email || '', user.name || ''))
  }

  const testImageUpload = async () => {
    if (!user) {
      setResults(prev => ({ 
        ...prev, 
        upload: { success: false, error: 'No user logged in' } 
      }))
      return
    }
    
    // Create a test file
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    await runTest('upload', () => uploadImage(testFile, user.id))
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#004D40] mb-4">DEBUG PAGE</h1>
          <p className="text-[#004D40] font-bold">Test Supabase functionality</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Supabase Connection Test */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">SUPABASE CONNECTION</h3>
              <Button
                onClick={testSupabaseConnection}
                disabled={loading === 'supabase'}
                className="w-full bg-[#44C76F] text-[#004D40] font-black mb-4"
              >
                {loading === 'supabase' ? 'TESTING...' : 'TEST CONNECTION'}
              </Button>
              {results.supabase && (
                <div className={`p-3 rounded border-2 ${results.supabase.success ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'}`}>
                  <p className="font-bold text-sm">
                    {results.supabase.success ? '✅ SUCCESS' : '❌ FAILED'}
                  </p>
                  {results.supabase.error && (
                    <p className="text-xs mt-1">{results.supabase.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Storage Test */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">STORAGE TEST</h3>
              <Button
                onClick={testStorage}
                disabled={loading === 'storage'}
                className="w-full bg-[#44C76F] text-[#004D40] font-black mb-4"
              >
                {loading === 'storage' ? 'TESTING...' : 'TEST STORAGE'}
              </Button>
              {results.storage && (
                <div className={`p-3 rounded border-2 ${results.storage.success ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'}`}>
                  <p className="font-bold text-sm">
                    {results.storage.success ? '✅ SUCCESS' : '❌ FAILED'}
                  </p>
                  {results.storage.error && (
                    <p className="text-xs mt-1">{results.storage.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bucket Test */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">BUCKET TEST</h3>
              <Button
                onClick={testBucketExists}
                disabled={loading === 'bucket'}
                className="w-full bg-[#44C76F] text-[#004D40] font-black mb-4"
              >
                {loading === 'bucket' ? 'TESTING...' : 'TEST AVATARS BUCKET'}
              </Button>
              {results.bucket && (
                <div className={`p-3 rounded border-2 ${results.bucket ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'}`}>
                  <p className="font-bold text-sm">
                    {results.bucket ? '✅ BUCKET EXISTS' : '❌ BUCKET NOT FOUND'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Profile Test */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">USER PROFILE</h3>
              <Button
                onClick={testUserProfile}
                disabled={loading === 'profile'}
                className="w-full bg-[#44C76F] text-[#004D40] font-black mb-4"
              >
                {loading === 'profile' ? 'TESTING...' : 'TEST PROFILE LOAD'}
              </Button>
              {results.profile && (
                <div className={`p-3 rounded border-2 ${results.profile ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'}`}>
                  <p className="font-bold text-sm">
                    {results.profile ? '✅ PROFILE FOUND' : '❌ NO PROFILE'}
                  </p>
                  {results.profile && (
                    <p className="text-xs mt-1">Name: {results.profile.name || 'N/A'}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ensure Profile Test */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">ENSURE PROFILE</h3>
              <Button
                onClick={testEnsureProfile}
                disabled={loading === 'ensureProfile'}
                className="w-full bg-[#44C76F] text-[#004D40] font-black mb-4"
              >
                {loading === 'ensureProfile' ? 'TESTING...' : 'TEST PROFILE CREATION'}
              </Button>
              {results.ensureProfile && (
                <div className={`p-3 rounded border-2 ${results.ensureProfile ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'}`}>
                  <p className="font-bold text-sm">
                    {results.ensureProfile ? '✅ PROFILE ENSURED' : '❌ FAILED'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Test */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">UPLOAD TEST</h3>
              <Button
                onClick={testImageUpload}
                disabled={loading === 'upload'}
                className="w-full bg-[#44C76F] text-[#004D40] font-black mb-4"
              >
                {loading === 'upload' ? 'TESTING...' : 'TEST IMAGE UPLOAD'}
              </Button>
              {results.upload && (
                <div className={`p-3 rounded border-2 ${results.upload.success ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'}`}>
                  <p className="font-bold text-sm">
                    {results.upload.success ? '✅ UPLOAD SUCCESS' : '❌ UPLOAD FAILED'}
                  </p>
                  {results.upload.error && (
                    <p className="text-xs mt-1">{results.upload.error}</p>
                  )}
                  {results.upload.url && (
                    <p className="text-xs mt-1">URL: {results.upload.url}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current User Info */}
        {user && (
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#B7C8B5]">
            <CardContent className="p-6">
              <h3 className="text-xl font-black text-[#004D40] mb-4">CURRENT USER</h3>
              <div className="space-y-2 text-sm">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Name:</strong> {user.name || 'N/A'}</p>
                <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                <p><strong>Age:</strong> {user.age || 'N/A'}</p>
                <p><strong>User Type:</strong> {user.userType || 'N/A'}</p>
                <p><strong>Profile Picture:</strong> {user.profilePicture ? 'Yes' : 'No'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 