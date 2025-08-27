"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import type { MessageInputProps, MentionSuggestion } from "@/types/enhanced-chat"

export default function EnhancedMessageInput({
  value,
  onChange,
  onSend,
  onFileUpload,
  chatUsers,
  disabled = false,
  placeholder = "Type your message..."
}: MessageInputProps) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState("")
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [showActions, setShowActions] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [value])

  // Handle mention detection
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = value.slice(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1])
      setMentionPosition({
        start: cursorPosition - mentionMatch[0].length,
        end: cursorPosition
      })
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }, [value])

  const filteredUsers = chatUsers.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  const handleMentionSelect = (user: MentionSuggestion) => {
    const beforeMention = value.slice(0, mentionPosition.start)
    const afterMention = value.slice(mentionPosition.end)
    const newValue = beforeMention + `@${user.name} ` + afterMention
    
    onChange(newValue)
    setShowMentions(false)
    
    // Focus back to textarea
    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.focus()
        const cursorPos = beforeMention.length + user.name.length + 2
        textarea.setSelectionRange(cursorPos, cursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSend()
      }
    }
    
    if (showMentions && (e.key === 'Escape')) {
      setShowMentions(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await onFileUpload(file)
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setIsUploading(false)
      e.target.value = '' // Reset file input
    }
  }

  return (
    <div className="relative">
      {/* Mention Suggestions */}
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border-2 border-sage/30 max-w-xs w-full z-10">
          <div className="p-2">
            <div className="text-xs text-sage mb-2 px-2">Mention someone</div>
            <div className="max-h-32 overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleMentionSelect(user)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-sage/10 rounded-lg transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-sage/20 flex items-center justify-center text-xs flex-shrink-0">
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" width={24} height={24} />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="roomeo-body text-sm text-emerald-primary truncate">
                    {user.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Input Container */}
      <div className="flex items-end gap-3 p-4 border-t border-sage/30 bg-white">
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-10 h-10 rounded-full bg-sage/10 hover:bg-sage/20 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Upload file"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-sage/30 border-t-emerald-primary"></div>
            ) : (
              <svg className="w-5 h-5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setShowActions(!showActions)}
            className="w-10 h-10 rounded-full bg-sage/10 hover:bg-sage/20 flex items-center justify-center transition-colors"
            title="More actions"
          >
            <svg className="w-5 h-5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full min-h-[44px] max-h-[120px] p-3 border-2 border-sage/30 rounded-xl resize-none roomeo-body focus:border-moss-green focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
          
          {/* Character Count */}
          {value.length > 800 && (
            <div className="absolute bottom-1 right-2 text-xs text-sage">
              {value.length}/1000
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="roomeo-button-primary w-12 h-12 rounded-full p-0 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>

      {/* Quick Actions Panel */}
      {showActions && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border-2 border-sage/30 p-3 min-w-[200px]">
          <div className="space-y-2">
            <button
              onClick={() => {
                // This would trigger poll creation modal
                setShowActions(false)
              }}
              className="w-full flex items-center gap-3 p-2 hover:bg-sage/10 rounded-lg transition-colors text-left"
            >
              <span>📊</span>
              <span className="roomeo-body text-sm text-emerald-primary">Create Poll</span>
            </button>
            
            <button
              onClick={() => {
                // This would trigger chore assignment modal
                setShowActions(false)
              }}
              className="w-full flex items-center gap-3 p-2 hover:bg-sage/10 rounded-lg transition-colors text-left"
            >
              <span>🧹</span>
              <span className="roomeo-body text-sm text-emerald-primary">Assign Chore</span>
            </button>
            
            <button
              onClick={() => {
                // This would trigger expense split modal
                setShowActions(false)
              }}
              className="w-full flex items-center gap-3 p-2 hover:bg-sage/10 rounded-lg transition-colors text-left"
            >
              <span>💰</span>
              <span className="roomeo-body text-sm text-emerald-primary">Split Expense</span>
            </button>
            
            <button
              onClick={() => {
                // This would trigger bill reminder modal
                setShowActions(false)
              }}
              className="w-full flex items-center gap-3 p-2 hover:bg-sage/10 rounded-lg transition-colors text-left"
            >
              <span>⚡</span>
              <span className="roomeo-body text-sm text-emerald-primary">Set Reminder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}