"use client"

import { useState } from "react"
import type { MessageReaction } from "@/types/enhanced-chat"

interface MessageReactionsProps {
  reactions: MessageReaction[]
  currentUserId: string
  onReactionAdd: (emoji: string) => Promise<void>
  onReactionRemove: (emoji: string) => Promise<void>
}

export default function MessageReactions({ 
  reactions, 
  currentUserId, 
  onReactionAdd, 
  onReactionRemove 
}: MessageReactionsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  if (!reactions || reactions.length === 0) return null

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasCurrentUser: false
      }
    }
    
    acc[reaction.emoji].count++
    acc[reaction.emoji].users.push(reaction.user?.name || 'Unknown')
    
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasCurrentUser = true
    }
    
    return acc
  }, {} as Record<string, { emoji: string; count: number; users: string[]; hasCurrentUser: boolean }>)

  const handleReactionClick = async (emoji: string, hasCurrentUser: boolean) => {
    if (isProcessing === emoji) return
    
    setIsProcessing(emoji)
    try {
      if (hasCurrentUser) {
        await onReactionRemove(emoji)
      } else {
        await onReactionAdd(emoji)
      }
    } catch (error) {
      console.error('Error handling reaction:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.values(groupedReactions).map(({ emoji, count, users, hasCurrentUser }) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji, hasCurrentUser)}
          disabled={isProcessing === emoji}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 disabled:opacity-50 ${
            hasCurrentUser 
              ? 'bg-emerald-primary text-gold-accent border border-emerald-primary' 
              : 'bg-sage/10 text-emerald-primary border border-sage/30 hover:bg-sage/20'
          }`}
          title={`${users.join(', ')} reacted with ${emoji}`}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  )
}