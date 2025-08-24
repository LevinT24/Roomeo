/**
 * ChatInput - Enhanced chat input component with typing detection and image upload
 */

"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string, type?: 'text' | 'image', imageUrl?: string) => Promise<void>
  onTyping?: (isTyping: boolean) => void
  onImageUpload?: (file: File) => Promise<string>
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  className?: string
}

export function ChatInput({
  onSendMessage,
  onTyping,
  onImageUpload,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 1000,
  className
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTypingTime = useRef<number>(0)

  /**
   * Handle typing detection with debouncing
   */
  const handleTypingStart = useCallback(() => {
    const now = Date.now()
    lastTypingTime.current = now
    
    if (!isTyping) {
      setIsTyping(true)
      onTyping?.(true)
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastTypingTime.current >= 2000) {
        setIsTyping(false)
        onTyping?.(false)
      }
    }, 2000)
  }, [isTyping, onTyping])

  /**
   * Handle typing stop
   */
  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (isTyping) {
      setIsTyping(false)
      onTyping?.(false)
    }
  }, [isTyping, onTyping])

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (value.length <= maxLength) {
      setMessage(value)
      
      if (value.trim()) {
        handleTypingStart()
      } else {
        handleTypingStop()
      }
    }
  }

  /**
   * Handle key press events
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    const trimmedMessage = message.trim()
    
    if ((!trimmedMessage && !uploadedImageUrl) || isSending || disabled) {
      return
    }

    try {
      setIsSending(true)
      handleTypingStop()
      
      if (uploadedImageUrl) {
        // Send image message
        await onSendMessage(trimmedMessage || '📷 Image', 'image', uploadedImageUrl)
        setUploadedImageUrl(null)
        setImagePreview(null)
      } else {
        // Send text message
        await onSendMessage(trimmedMessage)
      }
      
      setMessage('')
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Handle image file selection
   */
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImageUpload) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    try {
      setIsUploading(true)
      
      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
      
      // Upload image
      const uploadedUrl = await onImageUpload(file)
      setUploadedImageUrl(uploadedUrl)
      
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
      setImagePreview(null)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  /**
   * Remove image preview
   */
  const removeImagePreview = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setUploadedImageUrl(null)
  }

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const hasContent = message.trim() || uploadedImageUrl
  const charactersRemaining = maxLength - message.length

  return (
    <div className={cn("border-t bg-white p-4", className)}>
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-32 max-h-32 rounded-lg border border-gray-200"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={removeImagePreview}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              disabled={isUploading}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        {/* Image upload button */}
        {onImageUpload && (
          <div className="flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="Upload image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        )}
        
        {/* Text input */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "pr-12 resize-none",
              charactersRemaining < 50 && charactersRemaining >= 0 && "border-orange-300 focus:border-orange-500",
              charactersRemaining < 0 && "border-red-300 focus:border-red-500"
            )}
          />
          
          {/* Character counter */}
          {maxLength && message.length > maxLength * 0.8 && (
            <div className={cn(
              "absolute -top-6 right-0 text-xs",
              charactersRemaining < 50 && charactersRemaining >= 0 && "text-orange-500",
              charactersRemaining < 0 && "text-red-500"
            )}>
              {charactersRemaining < 0 ? `${-charactersRemaining} over limit` : `${charactersRemaining} left`}
            </div>
          )}
        </div>
        
        {/* Send button */}
        <div className="flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!hasContent || isSending || disabled || isUploading}
            className={cn(
              "px-4 py-2 min-w-[60px] transition-all",
              hasContent 
                ? "bg-blue-500 hover:bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </Button>
        </div>
      </div>
      
      {/* Typing indicator for current user */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-500 italic">
          You are typing...
        </div>
      )}
    </div>
  )
}

export default ChatInput