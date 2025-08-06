// components/SessionRecovery.tsx - Handle session interruptions gracefully
"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SessionRecoveryProps {
  onRecovered?: () => void
  className?: string
}

export default function SessionRecovery({ onRecovered, className = "" }: SessionRecoveryProps) {
  const { user, sessionValid, refreshSession, validateSession } = useAuth()
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [autoRecoveryAttempted, setAutoRecoveryAttempted] = useState(false)

  // Show recovery UI when session is invalid but user exists
  useEffect(() => {
    if (user && !sessionValid && !isRecovering) {
      setShowRecovery(true)
      
      // Try automatic recovery once
      if (!autoRecoveryAttempted) {
        setAutoRecoveryAttempted(true)
        handleAutoRecovery()
      }
    } else {
      setShowRecovery(false)
      setRecoveryError(null)
    }
  }, [user, sessionValid, isRecovering, autoRecoveryAttempted])

  const handleAutoRecovery = async () => {
    console.log('🔄 Attempting automatic session recovery...')
    
    try {
      const isValid = await validateSession()
      
      if (isValid) {
        console.log('✅ Session automatically recovered')
        setShowRecovery(false)
        onRecovered?.()
      } else {
        console.log('⚠️ Automatic recovery failed, showing manual options')
      }
    } catch (error) {
      console.error('❌ Auto recovery error:', error)
    }
  }

  const handleManualRecovery = async () => {
    setIsRecovering(true)
    setRecoveryError(null)

    try {
      console.log('🔄 Starting manual session recovery...')
      
      // Try session refresh first
      const refreshSuccess = await refreshSession()
      
      if (refreshSuccess) {
        // Validate the refreshed session
        const isValid = await validateSession()
        
        if (isValid) {
          console.log('✅ Session manually recovered')
          setShowRecovery(false)
          onRecovered?.()
          return
        }
      }
      
      // If refresh failed, guide user
      setRecoveryError('Session could not be recovered. Please sign in again.')
      
    } catch (error) {
      console.error('❌ Manual recovery error:', error)
      setRecoveryError('Recovery failed. Please refresh the page or sign in again.')
    } finally {
      setIsRecovering(false)
    }
  }

  const handleRefreshPage = () => {
    window.location.reload()
  }

  const handleSignOut = () => {
    // Redirect to landing page
    window.location.href = '/'
  }

  if (!showRecovery) {
    return null
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1]">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-500 border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_#004D40]">
              <span className="text-[#004D40] font-black text-xl transform -rotate-3">⚠</span>
            </div>
            <h2 className="text-2xl font-black text-[#004D40] mb-2 transform -skew-x-2">
              SESSION INTERRUPTED
            </h2>
            <div className="w-16 h-2 bg-orange-500 mx-auto transform skew-x-12 mb-4"></div>
          </div>

          <div className="text-center mb-6">
            <p className="text-[#004D40] font-bold mb-4">
              Your session was interrupted when you switched apps or lost connection. This sometimes happens to keep your data secure.
            </p>
            
            {recoveryError && (
              <div className="p-3 bg-red-100 border-2 border-red-500 rounded mb-4">
                <p className="text-red-700 font-bold text-sm">{recoveryError}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {!recoveryError && (
              <Button
                onClick={handleManualRecovery}
                disabled={isRecovering}
                className="w-full bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                {isRecovering ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#004D40] border-t-transparent rounded-full animate-spin"></div>
                    RECOVERING SESSION...
                  </div>
                ) : (
                  'RECOVER MY SESSION'
                )}
              </Button>
            )}

            <Button
              onClick={handleRefreshPage}
              variant="outline"
              className="w-full border-4 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black py-3 shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all bg-transparent"
            >
              REFRESH PAGE
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-2 border-gray-400 text-gray-600 hover:bg-gray-100 font-black py-2 text-sm"
            >
              SIGN OUT & START OVER
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600 font-bold">
              This helps protect your account when you switch between apps or lose internet connection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}