"use client"

import { useState } from "react"
import type { ChatExpenseSplit } from "@/types/enhanced-chat"

interface ExpenseDisplayProps {
  expense: ChatExpenseSplit
  currentUserId: string
  onAccept?: () => Promise<void>
  onReject?: () => Promise<void>
}

export default function ExpenseDisplay({ 
  expense, 
  currentUserId, 
  onAccept, 
  onReject 
}: ExpenseDisplayProps) {
  const [isProcessing, setIsProcessing] = useState<'accept' | 'reject' | null>(null)

  const isCreator = expense.created_by === currentUserId
  const canRespond = !isCreator && expense.status === 'proposed'

  const handleAccept = async () => {
    if (!onAccept || isProcessing) return
    
    setIsProcessing('accept')
    try {
      await onAccept()
    } catch (error) {
      console.error('Error accepting expense:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!onReject || isProcessing) return
    
    setIsProcessing('reject')
    try {
      await onReject()
    } catch (error) {
      console.error('Error rejecting expense:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  const getStatusColor = () => {
    switch (expense.status) {
      case 'accepted':
        return 'from-moss-green/20 to-moss-green/10 border-moss-green/30'
      case 'rejected':
        return 'from-alert-red/20 to-alert-red/10 border-alert-red/30'
      case 'completed':
        return 'from-emerald-primary/20 to-emerald-primary/10 border-emerald-primary/30'
      default:
        return 'from-sage/20 to-sage/10 border-sage/30'
    }
  }

  const getStatusIcon = () => {
    switch (expense.status) {
      case 'accepted':
        return '✅'
      case 'rejected':
        return '❌'
      case 'completed':
        return '💰'
      default:
        return '💸'
    }
  }

  const getStatusText = () => {
    switch (expense.status) {
      case 'proposed':
        return 'Waiting for response'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      case 'completed':
        return 'Completed'
      default:
        return expense.status
    }
  }

  return (
    <div className={`bg-gradient-to-r ${getStatusColor()} rounded-xl p-4 border-2`}>
      {/* Expense Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-sage/30">
          <span className="text-sm">{getStatusIcon()}</span>
        </div>
        <div className="flex-1">
          <h4 className="roomeo-heading text-lg text-emerald-primary mb-1">
            {expense.description}
          </h4>
          <div className="flex items-center gap-2 text-xs text-sage">
            <span>proposed by {expense.created_by_user?.name || 'Unknown'}</span>
            <span>•</span>
            <span>${expense.total_amount.toFixed(2)} total</span>
            <span>•</span>
            <span>{new Date(expense.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="roomeo-heading text-xl text-emerald-primary">
            ${expense.total_amount.toFixed(2)}
          </div>
          <div className="text-xs text-sage">
            ${(expense.total_amount / 2).toFixed(2)} each
          </div>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          expense.status === 'accepted' 
            ? 'bg-moss-green text-white' 
            : expense.status === 'rejected'
              ? 'bg-alert-red text-white'
              : expense.status === 'completed'
                ? 'bg-emerald-primary text-white'
                : 'bg-sage text-white'
        }`}>
          {getStatusText()}
        </span>

        {canRespond && (
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isProcessing === 'reject'}
              className="bg-alert-red hover:bg-alert-red/90 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isProcessing === 'reject' ? (
                <div className="animate-spin rounded-full h-3 w-3 border border-white/30 border-t-white"></div>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              Reject
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing === 'accept'}
              className="bg-moss-green hover:bg-moss-green/90 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isProcessing === 'accept' ? (
                <div className="animate-spin rounded-full h-3 w-3 border border-white/30 border-t-white"></div>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Accept
            </button>
          </div>
        )}

        {expense.status === 'accepted' && isCreator && (
          <div className="flex items-center gap-2 text-xs text-moss-green">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Split accepted! Add to expenses tracker?</span>
          </div>
        )}
      </div>

      {expense.status === 'rejected' && (
        <div className="mt-3 pt-3 border-t border-alert-red/20">
          <p className="text-xs text-sage">
            This expense split was rejected. You can propose a different amount or discuss the details.
          </p>
        </div>
      )}
    </div>
  )
}