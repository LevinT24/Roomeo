"use client"

import { useState } from "react"
import type { ChatPoll, PollVote } from "@/types/enhanced-chat"

interface PollDisplayProps {
  poll: ChatPoll
  currentUserId: string
  onVote: (optionIndex: number) => Promise<void>
}

export default function PollDisplay({ poll, currentUserId, onVote }: PollDisplayProps) {
  const [isVoting, setIsVoting] = useState<number | null>(null)

  const totalVotes = poll.votes?.length || 0
  const userVotes = poll.votes?.filter(vote => vote.user_id === currentUserId) || []
  const hasUserVoted = userVotes.length > 0
  
  // Calculate vote counts per option
  const optionVotes = poll.options.map((option, index) => {
    const votes = poll.votes?.filter(vote => vote.option_index === index) || []
    return {
      ...option,
      votes: votes.length,
      percentage: totalVotes > 0 ? (votes.length / totalVotes) * 100 : 0,
      voters: votes.map(vote => vote.user?.name || 'Unknown').filter(Boolean)
    }
  })

  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false
  const canVote = !isExpired && (!hasUserVoted || poll.multiple_choice)

  const handleVote = async (optionIndex: number) => {
    if (isVoting !== null || !canVote) return
    
    setIsVoting(optionIndex)
    try {
      await onVote(optionIndex)
    } catch (error) {
      console.error('Error voting on poll:', error)
    } finally {
      setIsVoting(null)
    }
  }

  return (
    <div className="bg-gradient-to-r from-moss-green/10 to-sage/10 rounded-xl p-4 border-2 border-moss-green/30">
      {/* Poll Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-moss-green flex items-center justify-center flex-shrink-0">
          <span className="text-sm">📊</span>
        </div>
        <div className="flex-1">
          <h4 className="roomeo-heading text-lg text-emerald-primary mb-1">
            {poll.question}
          </h4>
          <div className="flex items-center gap-2 text-xs text-sage">
            <span>by {poll.created_by_user?.name || 'Unknown'}</span>
            <span>•</span>
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            {poll.multiple_choice && (
              <>
                <span>•</span>
                <span>Multiple choice</span>
              </>
            )}
            {isExpired && (
              <>
                <span>•</span>
                <span className="text-alert-red">Expired</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Poll Options */}
      <div className="space-y-3">
        {optionVotes.map((option, index) => {
          const isSelected = userVotes.some(vote => vote.option_index === index)
          const isCurrentlyVoting = isVoting === index
          
          return (
            <div key={option.id} className="relative">
              <button
                onClick={() => handleVote(index)}
                disabled={!canVote || isCurrentlyVoting}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all disabled:cursor-not-allowed ${
                  isSelected
                    ? 'border-emerald-primary bg-emerald-primary/10'
                    : 'border-sage/30 hover:border-sage/50 bg-white'
                } ${!canVote ? 'opacity-75' : 'hover:shadow-sm'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="roomeo-body text-emerald-primary font-medium">
                    {option.text}
                  </span>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-gold-accent" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {isCurrentlyVoting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-sage/30 border-t-emerald-primary"></div>
                    )}
                    <span className="roomeo-body text-sm font-bold text-emerald-primary">
                      {option.votes}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-sage/20 rounded-full h-2 mb-1">
                  <div 
                    className="bg-gradient-to-r from-emerald-primary to-moss-green h-2 rounded-full transition-all duration-500"
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
                
                {/* Percentage and Voters */}
                <div className="flex items-center justify-between text-xs text-sage">
                  <span>{option.percentage.toFixed(1)}%</span>
                  {option.voters.length > 0 && (
                    <span title={option.voters.join(', ')}>
                      {option.voters.slice(0, 3).join(', ')}
                      {option.voters.length > 3 && ` +${option.voters.length - 3} more`}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Poll Footer */}
      <div className="mt-4 pt-3 border-t border-sage/20">
        <div className="flex items-center justify-between text-xs text-sage">
          <span>
            Created {new Date(poll.created_at).toLocaleDateString()}
          </span>
          {poll.expires_at && (
            <span>
              {isExpired ? 'Expired' : 'Expires'} {new Date(poll.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}