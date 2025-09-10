"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import { ExpenseCardProps, ExpenseParticipantSummary } from "@/types/expenses"

export default function ExpenseCard({ expense, onSettleUp, currentUserId, onMarkPaid, onViewDetails, onDelete }: ExpenseCardProps) {
  // Check if current user is the creator
  const isCreator = currentUserId === expense.created_by_id
  
  // For creators: they don't owe anything, they're owed money
  // For participants: they owe their share minus what they've paid
  const remainingAmount = isCreator ? 0 : (expense.amount_owed - expense.amount_paid)
  const isSettled = expense.is_settled || (isCreator ? false : remainingAmount <= 0.01)

  const getStatusColor = () => {
    if (isSettled) return "bg-roomeo-success/10 text-roomeo-success border-roomeo-success/20"
    if (expense.pending_settlement && expense.pending_settlement.status === 'pending') return "bg-yellow-50 text-yellow-700 border-yellow-200"
    if (remainingAmount > 0) return "bg-sage/10 text-roomeo-danger border-sage/20"
    return "bg-sage/10 text-emerald-primary border-sage/20"
  }

  const getStatusText = () => {
    if (isSettled) return "✅ Settled"
    if (expense.pending_settlement && expense.pending_settlement.status === 'pending') return "⏳ Pending Approval"
    if (remainingAmount > 0) return "💳 Outstanding"
    return "🎉 Complete"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCategoryEmoji = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('food') || lowerName.includes('restaurant') || lowerName.includes('dinner')) return '🍕'
    if (lowerName.includes('house') || lowerName.includes('rent') || lowerName.includes('utilities')) return '🏠'
    if (lowerName.includes('travel') || lowerName.includes('uber') || lowerName.includes('transport')) return '🚕'
    if (lowerName.includes('fun') || lowerName.includes('entertainment') || lowerName.includes('game')) return '🎮'
    if (lowerName.includes('bills') || lowerName.includes('electric') || lowerName.includes('internet')) return '💡'
    return '💰'
  }

  return (
    <div className="roomeo-card p-6 hover:bg-sage/5 cursor-pointer group animate-slide-up">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-xl bg-emerald-primary shrink-0 size-14 text-2xl">
            {getCategoryEmoji(expense.group_name)}
          </div>
          <div>
            <h3 className="roomeo-heading text-lg group-hover:text-gold-accent transition-colors">{expense.group_name}</h3>
            {expense.group_description && (
              <p className="roomeo-body text-emerald-primary/60 text-sm mt-1">{expense.group_description}</p>
            )}
            <p className="roomeo-body text-emerald-primary/50 text-xs mt-2">
              Created by {expense.created_by_name} • {formatDate(expense.created_at)}
            </p>
          </div>
        </div>
        
        <div className={`${getStatusColor()} font-medium px-3 py-1.5 rounded-full text-xs`}>
          {getStatusText()}
        </div>
      </div>

      <div className="mb-5 p-4 bg-mint-cream rounded-xl border border-sage/20">
        <div className="text-center">
          <p className="roomeo-body text-emerald-primary/60 text-sm">💸 Total Amount</p>
          <p className="roomeo-heading text-2xl text-emerald-primary">${expense.total_amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Creator Payment Info - Simplified */}
      {isCreator && (
        <div className="mb-5">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 bg-roomeo-success/10 rounded-xl">
              <p className="roomeo-body text-emerald-primary/60 text-xs mb-1">💰 You Paid</p>
              <p className="roomeo-heading text-lg text-roomeo-success">${expense.amount_paid.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-roomeo-danger/10 rounded-xl">
              <p className="roomeo-body text-emerald-primary/60 text-xs mb-1">⏳ Still Owed</p>
              <p className="roomeo-heading text-lg text-roomeo-danger">
                ${(expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : (p.amount_owed - p.amount_paid)), 0) || 0).toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-2">
            <div className="w-full bg-sage/30 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-moss-green to-roomeo-success h-3 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${(expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : p.amount_owed), 0) || 1) > 0 ? Math.min(((expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : p.amount_paid), 0) || 0) / (expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : p.amount_owed), 0) || 1)) * 100, 100) : 0}%`
                }}
              ></div>
            </div>
            <p className="roomeo-body text-emerald-primary/50 text-xs mt-1 text-center">
              {(expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : p.amount_owed), 0) || 1) > 0 ? (((expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : p.amount_paid), 0) || 0) / (expense.participants?.reduce((sum, p) => sum + (p.is_creator ? 0 : p.amount_owed), 0) || 1)) * 100).toFixed(0) : '0'}% collected
            </p>
          </div>
        </div>
      )}

      {/* Participant Payment Info */}
      {!isCreator && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="roomeo-body text-emerald-primary/60 text-sm">✅ Paid:</span>
            <span className="roomeo-body text-roomeo-success font-semibold">
              ${expense.amount_paid.toFixed(2)}
            </span>
          </div>
          {!isSettled && (
            <div className="flex items-center gap-2 mb-3">
              <span className="roomeo-body text-emerald-primary/60 text-sm">⏳ Remaining:</span>
              <span className="roomeo-body text-roomeo-danger font-semibold">
                ${remainingAmount.toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Progress bar */}
          <div className="mb-2">
            <div className="w-full bg-sage/30 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-moss-green to-roomeo-success h-3 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${expense.amount_owed > 0 ? Math.min((expense.amount_paid / expense.amount_owed) * 100, 100) : 0}%`
                }}
              ></div>
            </div>
            <p className="roomeo-body text-emerald-primary/50 text-xs mt-1 text-center">
              {expense.amount_owed > 0 ? ((expense.amount_paid / expense.amount_owed) * 100).toFixed(0) : '0'}% paid
            </p>
          </div>
        </div>
      )}

      {/* Only show Pay button for non-creators who have remaining balance and no pending settlement */}
      {!isCreator && !isSettled && remainingAmount > 0 && expense.amount_owed > 0 && 
       !(expense.pending_settlement && expense.pending_settlement.status === 'pending') && (
        <div className="flex gap-3 mb-4">
          <button 
            onClick={() => onSettleUp(expense.group_id)}
            className="flex-1 roomeo-button-primary flex items-center justify-center gap-2"
          >
            <span>💳</span> Pay ${remainingAmount.toFixed(2)}
          </button>
          <button 
            onClick={() => onSettleUp(expense.group_id)}
            className="roomeo-button-secondary flex items-center gap-2 px-4"
          >
            <span>📊</span> Details
          </button>
        </div>
      )}

      {/* Show pending settlement status for non-creators */}
      {!isCreator && expense.pending_settlement && expense.pending_settlement.status === 'pending' && (
        <div className="flex gap-3 mb-4">
          <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="roomeo-body text-yellow-800 font-medium">⏳ Payment Pending Approval</p>
                <p className="roomeo-body text-yellow-600 text-sm">
                  ${expense.pending_settlement.amount.toFixed(2)} via {expense.pending_settlement.payment_method}
                </p>
              </div>
              <div className="text-yellow-600">
                <span className="text-sm">📋</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Show details and delete buttons for creators */}
      {isCreator && (
        <div className="flex gap-3 mb-4">
          <button 
            onClick={() => onViewDetails ? onViewDetails(expense.group_id) : onSettleUp(expense.group_id)}
            className="roomeo-button-secondary flex items-center justify-center gap-2 flex-1"
          >
            <span>📊</span> View Details
          </button>
          {onDelete && (
            <button 
              onClick={() => onDelete(expense.group_id)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}


      {/* Participants Section */}
      {expense.participants && expense.participants.length > 0 && (
        <div className="border-t border-sage/20 pt-4 mb-4">
          <h4 className="roomeo-heading text-sm mb-3 flex items-center gap-2">
            <span>👥</span> Friends Balance
          </h4>
          <div className="space-y-2">
            {expense.participants.map((participant) => (
              <div key={participant.user_id} 
                className={`flex items-center justify-between p-3 rounded-xl border hover:bg-sage/10 hover:shadow-card transition-all duration-200 cursor-pointer ${
                  participant.is_settled 
                    ? 'bg-roomeo-success/10 border-roomeo-success/20' 
                    : 'bg-sage/10 border-sage/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-sage/30 bg-cover bg-center border-2 border-white shadow-sm"
                    style={{
                      backgroundImage: participant.profile_picture
                        ? `url("${participant.profile_picture}")`
                        : 'url("/placeholder.svg?height=32&width=32")'
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="roomeo-body font-semibold text-emerald-primary">
                        {participant.name}
                      </span>
                      {participant.is_creator && (
                        <span className="text-xs bg-gold-accent text-white px-2 py-0.5 rounded-full font-medium">
                          👑 Creator
                        </span>
                      )}
                    </div>
                    <div className="roomeo-body text-xs text-emerald-primary/60">
                      Owes: ${participant.amount_owed.toFixed(2)} • Paid: ${participant.amount_paid.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Payment Status & Controls */}
                <div className="flex items-center gap-2">
                  {participant.is_settled ? (
                    <span className="text-xs bg-roomeo-success/20 text-roomeo-success px-3 py-1.5 rounded-full font-medium">
                      ✅ Settled
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-roomeo-danger/20 text-roomeo-danger px-3 py-1.5 rounded-full font-medium">
                        ${(participant.amount_owed - participant.amount_paid).toFixed(2)} left
                      </span>
                      
                      {/* Creator can mark others as paid */}
                      {expense.created_by_name && currentUserId && participant.user_id !== currentUserId && onMarkPaid && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onMarkPaid(expense.group_id, participant.user_id, true)}
                            className="roomeo-interactive text-xs bg-roomeo-success text-white px-2 py-1 rounded-lg hover:bg-roomeo-success/80 hover:no-underline transition-colors"
                            title="Mark as paid"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => onMarkPaid(expense.group_id, participant.user_id, false)}
                            className="roomeo-interactive text-xs bg-sage text-emerald-primary px-2 py-1 rounded-lg hover:bg-sage/80 hover:no-underline transition-colors"
                            title="Mark as unpaid"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSettled && (
        <div className="w-full text-center py-4 px-6 bg-roomeo-success/10 border border-roomeo-success/20 rounded-xl mt-4">
          <span className="roomeo-body text-roomeo-success font-semibold flex items-center justify-center gap-2 text-lg">
            <span className="text-2xl">🎉</span>
            All settled up!
          </span>
        </div>
      )}
    </div>
  )
}