"use client"

import { useState } from "react"
import type { ChoreAssignment } from "@/types/enhanced-chat"

interface ChoreDisplayProps {
  chore: ChoreAssignment
  currentUserId: string
  onComplete: () => Promise<void>
}

export default function ChoreDisplay({ chore, currentUserId, onComplete }: ChoreDisplayProps) {
  const [isCompleting, setIsCompleting] = useState(false)

  const isAssignedToUser = chore.assigned_to === currentUserId
  const isOverdue = chore.due_date && new Date(chore.due_date) < new Date() && chore.status === 'pending'
  const isCompleted = chore.status === 'completed'

  const handleComplete = async () => {
    if (!isAssignedToUser || isCompleting || isCompleted) return
    
    setIsCompleting(true)
    try {
      await onComplete()
    } catch (error) {
      console.error('Error completing chore:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const getStatusColor = () => {
    if (isCompleted) return 'from-moss-green/20 to-moss-green/10 border-moss-green/30'
    if (isOverdue) return 'from-alert-red/20 to-alert-red/10 border-alert-red/30'
    return 'from-sage/20 to-sage/10 border-sage/30'
  }

  const getStatusIcon = () => {
    if (isCompleted) return '✅'
    if (isOverdue) return '⚠️'
    return '🧹'
  }

  return (
    <div className={`bg-gradient-to-r ${getStatusColor()} rounded-xl p-4 border-2`}>
      {/* Chore Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-sage/30">
          <span className="text-sm">{getStatusIcon()}</span>
        </div>
        <div className="flex-1">
          <h4 className="roomeo-heading text-lg text-emerald-primary mb-1">
            {chore.chore_name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-sage">
            <span>assigned to {chore.assigned_to_user?.name || 'Unknown'}</span>
            <span>•</span>
            <span>by {chore.assigned_by_user?.name || 'Unknown'}</span>
            {chore.due_date && (
              <>
                <span>•</span>
                <span className={isOverdue ? 'text-alert-red font-medium' : ''}>
                  due {new Date(chore.due_date).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isCompleted 
              ? 'bg-moss-green text-white' 
              : isOverdue 
                ? 'bg-alert-red text-white' 
                : 'bg-sage text-white'
          }`}>
            {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
          </span>
          
          {isCompleted && chore.completed_at && (
            <span className="text-xs text-sage">
              completed {new Date(chore.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {isAssignedToUser && !isCompleted && (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="bg-moss-green hover:bg-moss-green/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCompleting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border border-white/30 border-t-white"></div>
                Completing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark Complete
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}