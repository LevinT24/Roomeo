"use client"

import { useState } from "react"
import type { ReactionPickerProps } from "@/types/enhanced-chat"

const ROOMMATE_EMOJIS = [
  "👍", "❤️", "😂", "😮", "😢", "😡", 
  "🔥", "✨", "💯", "🎉", "🏠", "🛏️",
  "🍕", "🧹", "💰", "📱", "⚡", "💡"
]

export default function ReactionPicker({ 
  messageId, 
  currentUserId, 
  onReactionAdd, 
  isOpen, 
  onClose 
}: ReactionPickerProps) {
  const [isAdding, setIsAdding] = useState(false)

  if (!isOpen) return null

  const handleEmojiClick = async (emoji: string) => {
    if (isAdding) return
    
    setIsAdding(true)
    try {
      await onReactionAdd(emoji)
      onClose()
    } catch (error) {
      console.error('Error adding reaction:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20" 
        onClick={onClose}
      />
      
      {/* Reaction Picker */}
      <div className="absolute z-50 bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border-2 border-sage/30 p-4 min-w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="roomeo-heading text-sm text-emerald-primary">Add Reaction</h4>
          <button 
            onClick={onClose}
            className="text-sage hover:text-emerald-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-6 gap-2">
          {ROOMMATE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              disabled={isAdding}
              className="w-10 h-10 flex items-center justify-center text-xl hover:bg-sage/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}