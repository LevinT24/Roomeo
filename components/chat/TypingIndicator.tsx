/**
 * TypingIndicator - Animated typing indicator component
 * Shows when other users are typing with smooth animations
 */

"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  isVisible: boolean
  typingUsers: string[]
  className?: string
}

export function TypingIndicator({ 
  isVisible, 
  typingUsers, 
  className 
}: TypingIndicatorProps) {
  if (!isVisible || typingUsers.length === 0) {
    return null
  }

  /**
   * Format typing users text
   */
  const getTypingText = (): string => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing`
    } else if (typingUsers.length === 3) {
      return `${typingUsers[0]}, ${typingUsers[1]} and ${typingUsers[2]} are typing`
    } else {
      return `${typingUsers[0]}, ${typingUsers[1]} and ${typingUsers.length - 2} others are typing`
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 animate-in slide-in-from-bottom-2 fade-in duration-300",
        "transition-all ease-out",
        className
      )}
    >
      {/* Avatar placeholder */}
      <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
      
      {/* Typing bubble */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1">
          {/* Animated dots */}
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
            />
          </div>
        </div>
      </div>
      
      {/* Typing text */}
      <div className="text-xs text-gray-500 italic">
        {getTypingText()}
      </div>
    </div>
  )
}

/**
 * Simple typing dots animation (alternative minimal version)
 */
export function TypingDots({ 
  className,
  size = 'md' 
}: { 
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }
  
  const dotSize = dotSizes[size]
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className={cn(dotSize, "bg-gray-400 rounded-full animate-bounce")}
        style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
      />
      <div
        className={cn(dotSize, "bg-gray-400 rounded-full animate-bounce")}
        style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
      />
      <div
        className={cn(dotSize, "bg-gray-400 rounded-full animate-bounce")}
        style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
      />
    </div>
  )
}

/**
 * Typing indicator with custom styling for WhatsApp-like appearance
 */
export function WhatsAppTypingIndicator({ 
  isVisible, 
  className 
}: { 
  isVisible: boolean
  className?: string 
}) {
  if (!isVisible) return null
  
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 animate-in slide-in-from-bottom-2 fade-in duration-300",
        className
      )}
    >
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <TypingDots />
      </div>
    </div>
  )
}

/**
 * Multiple users typing indicator with avatars
 */
export function MultiUserTypingIndicator({
  typingUsers,
  getUserAvatar,
  className
}: {
  typingUsers: Array<{ id: string; name: string }>
  getUserAvatar?: (userId: string) => string
  className?: string
}) {
  if (typingUsers.length === 0) return null
  
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 animate-in slide-in-from-bottom-2 fade-in duration-300",
        className
      )}
    >
      {/* Show up to 3 avatars */}
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user, index) => (
          <div
            key={user.id}
            className="relative"
            style={{ zIndex: 3 - index }}
          >
            <img
              src={getUserAvatar?.(user.id) || '/placeholder.svg'}
              alt={user.name}
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
            />
            {/* Typing animation pulse */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
              <div className="w-full h-full bg-green-500 rounded-full animate-ping" />
            </div>
          </div>
        ))}
        {typingUsers.length > 3 && (
          <div className="flex items-center justify-center w-6 h-6 bg-gray-200 text-xs font-semibold text-gray-600 rounded-full border-2 border-white shadow-sm">
            +{typingUsers.length - 3}
          </div>
        )}
      </div>
      
      {/* Typing bubble with dots */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
        <TypingDots size="sm" />
      </div>
      
      {/* Typing text */}
      <div className="text-xs text-gray-500 italic">
        {typingUsers.length === 1
          ? `${typingUsers[0].name} is typing...`
          : `${typingUsers.length} people are typing...`
        }
      </div>
    </div>
  )
}

export default TypingIndicator