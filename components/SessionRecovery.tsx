"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { autoRecovery, sessionUtils } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface SessionRecoveryProps {
  onRecovered?: () => void
  className?: string
}

export default function SessionRecovery({ onRecovered, className = "" }: SessionRecoveryProps) {
  const { user, sessionValid, refreshSession } = useAuth()
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)

  // Show recovery UI when session is invalid but user exists
  useEffect(() => {
    if (user && !sessionValid && !isRecovering) {
      setShowRecovery(true)
    } else {
      setShowRecovery(false)
      setRecoveryError(null)
    }
  }, [user, sessionValid, isRecovering])

  const handleRecovery = async () => {
    setIsRecovering(true)
    setRecoveryError(null)

    try {
      console.log('🔄 Starting session recovery...')
      
      // Try auto-recovery first
      const recoveryResult = await autoRecovery.recoverSession()
      
      if (recoveryResult.success) {
        console.log(`✅ Session recovered via: ${recoveryResult.action}`)
        
        // Refresh auth state
        await refreshSession()
        
        // Notify parent component
        onRecovered?.()
        
        setShowRecovery(false)
      } else {
        console.error(`❌ Recovery failed: ${recoveryResult.action} - ${recoveryResult.error}`)
        
        // Handle different failure modes
        switch (recoveryResult.action) {
          case 'no_session':
            setRecoveryError('Please sign in again to continue.')
            break
          case 'refresh_failed':
            setRecoveryError('Session expired. Please refresh the page and sign in again.')
            break
          case 'connection_failed':
            setRecoveryError('Connection lost. Please check your internet connection.')
            break
          default:
            setRecoveryError('Session recovery failed. Please refresh the page.')
        }
      }
    } catch (error) {
      console.error('❌ Recovery exception:', error)
      setRecoveryError('An unexpected error occurred. Please refresh the page.')
    } finally {
      setIsRecovering(false)
    }
  }

  const handleRefreshPage = () => {
    window.location.reload()
  }

  const handleSignOut = async () => {
    // This will be handled by the auth context
    window.location.href = '/'
  }

  if (!showRecovery) {
    return null
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-[#F2F5F1] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] rounded-lg p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-orange-500 border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_#004D40]">
            <span className="text-[#004D40] font-black text-xl transform -rotate-3">⚠</span>
          </div>
          <h2 className="text-2xl font-black text-[#004D40] mb-2 transform -skew-x-2">
            SESSION ISSUE
          </h2>
          <div className="w-16 h-2 bg-orange-500 mx-auto transform skew-x-12 mb-4"></div>
        </div>

        <div className="text-center mb-6">
          <p className="text-[#004D40] font-bold mb-4">
            Your session seems to have been interrupted. This can happen when switching between apps or after periods of inactivity.
          </p>
          
          {recoveryError && (
            <div className="p-3 bg-red-100 border-2 border-red-500 rounded mb-4">
              <p className="text-red-700 font-bold text-sm">{recoveryError}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRecovery}
            disabled={isRecovering}
            className="w-full bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
          >
            {isRecovering ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#004D40] border-t-transparent rounded-full animate-spin"></div>
                RECOVERING...
              </div>
            ) : (
              'TRY TO RECOVER SESSION'
            )}
          </Button>

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
            This usually happens when the app loses connection or after switching to other apps.
          </p>
        </div>
      </div>
    </div>
  )
}