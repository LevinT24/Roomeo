// ==========================================
// CREATE: components/FriendsDebugButton.tsx (Optional Debug Component)
// ==========================================

"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { authAPI } from '@/lib/api'

export default function FriendsDebugButton() {
  const [debugResult, setDebugResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDebug = async () => {
    setLoading(true)
    try {
      const response = await authAPI.get('/api/friends/debug')
      const result = await response.json()
      setDebugResult(result)
    } catch (error) {
      setDebugResult({
        error: 'Failed to run debug test',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="border-2 border-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-bold text-blue-800 mb-2">Friends System Debug</h3>
          <Button
            onClick={runDebug}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold mb-2"
          >
            {loading ? 'Testing...' : 'Test Friends System'}
          </Button>
          
          {debugResult && (
            <div className="mt-4 p-3 bg-white border rounded text-sm max-h-96 overflow-y-auto">
              <div className="font-bold mb-2">{debugResult.status}</div>
              
              {debugResult.errors?.length > 0 && (
                <div className="text-red-600 mb-2">
                  <div className="font-bold">Errors:</div>
                  <ul className="list-disc list-inside">
                    {debugResult.errors.map((error: string, i: number) => (
                      <li key={i} className="text-xs">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {debugResult.warnings?.length > 0 && (
                <div className="text-yellow-600 mb-2">
                  <div className="font-bold">Warnings:</div>
                  <ul className="list-disc list-inside">
                    {debugResult.warnings.map((warning: string, i: number) => (
                      <li key={i} className="text-xs">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {debugResult.next_steps && (
                <div className="text-green-600">
                  <div className="font-bold">Next Steps:</div>
                  <ul className="list-disc list-inside">
                    {debugResult.next_steps.map((step: string, i: number) => (
                      <li key={i} className="text-xs">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}