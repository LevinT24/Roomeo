/**
 * MessageBubble - Professional message bubble component with status indicators
 * Similar to WhatsApp/Instagram message styling
 */

"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import type { ChatMessage, OptimisticMessage } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: ChatMessage | OptimisticMessage
  isOwn: boolean
  showAvatar?: boolean
  isFirst?: boolean
  isLast?: boolean
  onRetry?: () => void
  onImageClick?: (imageUrl: string) => void
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = false,
  isFirst = false,
  isLast = false,
  onRetry,
  onImageClick
}: MessageBubbleProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  
  const isOptimistic = 'isOptimistic' in message && message.isOptimistic
  const hasError = 'error' in message && message.error
  const isImage = message.message_type === 'image'
  
  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      return `${days[date.getDay()]} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString()
    }
  }

  /**
   * Render message status indicators
   */
  const renderStatusIcon = () => {
    if (!isOwn || isOptimistic) return null
    
    if (hasError) {
      return (
        <button
          onClick={onRetry}
          className="flex items-center justify-center w-4 h-4 ml-1 text-red-500 hover:text-red-700 transition-colors"
          title="Click to retry"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )
    }
    
    if (message.is_read) {
      return (
        <div className="flex items-center ml-1" title="Read">
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-4 h-4 text-blue-500 -ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }
    
    if (message.is_delivered) {
      return (
        <div className="flex items-center ml-1" title="Delivered">
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-4 h-4 text-gray-500 -ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }
    
    // Sent
    return (
      <div className="flex items-center ml-1" title="Sent">
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  /**
   * Render image message
   */
  const renderImageMessage = () => {
    if (!isImage || !message.image_url) return null
    
    return (
      <div className="relative group">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg animate-pulse">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {imageError ? (
          <div className="flex items-center justify-center w-48 h-32 bg-gray-200 rounded-lg">
            <div className="text-center text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs">Failed to load image</p>
            </div>
          </div>
        ) : (
          <Image
            src={message.image_url}
            alt="Shared image"
            className={cn(
              "max-w-48 max-h-64 rounded-lg cursor-pointer transition-all",
              imageLoading && "invisible"
            )}
            width={192}
            height={256}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true)
              setImageLoading(false)
            }}
            onClick={() => onImageClick?.(message.image_url!)}
          />
        )}
        
        {message.content && (
          <div className="mt-2 text-sm">
            {message.content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[95%] group animate-in slide-in-from-bottom-2 duration-300",
        isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <div className="flex-shrink-0 w-8 h-8">
          <Image
            src={message.sender_avatar || '/placeholder.svg'}
            alt={message.sender_name || 'User'}
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
            width={32}
            height={32}
          />
        </div>
      )}
      
      {/* Message bubble */}
      <div
        className={cn(
          "relative px-3 py-2 rounded-2xl shadow-sm max-w-sm md:max-w-lg lg:max-w-2xl",
          "transition-all duration-200 hover:shadow-md word-break break-words",
          isOwn
            ? cn(
                "bg-blue-500 text-white",
                isFirst && "rounded-tr-md",
                isLast && "rounded-br-md",
                isOptimistic && "bg-blue-400 opacity-70",
                hasError && "bg-red-500"
              )
            : cn(
                "bg-white text-gray-900 border border-gray-200",
                isFirst && "rounded-tl-md",
                isLast && "rounded-bl-md"
              )
        )}
      >
        {/* Sender name for group chats */}
        {!isOwn && showAvatar && isFirst && (
          <div className="text-xs font-semibold text-gray-600 mb-1">
            {message.sender_name}
          </div>
        )}
        
        {/* Message content */}
        <div className="break-words">
          {isImage ? renderImageMessage() : (
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
        
        {/* Timestamp and status */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1 text-xs",
          isOwn ? "text-blue-100" : "text-gray-500"
        )}>
          {/* Optimistic indicator */}
          {isOptimistic && (
            <div className="flex items-center mr-1">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          
          {/* Error indicator */}
          {hasError && (
            <span className="text-xs mr-1" title={hasError}>
              Failed
            </span>
          )}
          
          <span className="opacity-75">
            {formatTime(message.created_at)}
          </span>
          
          {renderStatusIcon()}
        </div>
        
        {/* Message tail */}
        {isLast && (
          <div
            className={cn(
              "absolute bottom-0 w-3 h-3",
              isOwn
                ? "right-0 transform translate-x-1 bg-blue-500"
                : "left-0 transform -translate-x-1 bg-white border-l border-b border-gray-200"
            )}
            style={{
              clipPath: isOwn
                ? "polygon(0 0, 100% 100%, 0 100%)"
                : "polygon(100% 0, 100% 100%, 0 100%)"
            }}
          />
        )}
      </div>
      
      {/* Spacer for own messages */}
      {showAvatar && isOwn && <div className="w-8" />}
    </div>
  )
}

export default MessageBubble