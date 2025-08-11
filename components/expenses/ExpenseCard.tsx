"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExpenseCardProps, ExpenseParticipantSummary } from "@/types/expenses"

export default function ExpenseCard({ expense, onSettleUp, currentUserId, onMarkPaid }: ExpenseCardProps) {
  const remainingAmount = expense.amount_owed - expense.amount_paid
  const isSettled = expense.is_settled || remainingAmount <= 0.01

  const getStatusColor = () => {
    if (isSettled) return "bg-emerald-100 text-emerald-700 border-emerald-200"
    if (remainingAmount > 0) return "bg-orange-100 text-orange-700 border-orange-200"
    return "bg-gray-100 text-gray-700 border-gray-200"
  }

  const getStatusText = () => {
    if (isSettled) return "Settled"
    if (remainingAmount > 0) return "Outstanding"
    return "Complete"
  }

  // Check if there's a pending settlement for this expense
  const hasPendingSettlement = expense.participants?.some(
    p => p.user_id === currentUserId && p.amount_paid > 0 && !p.is_settled
  ) || false;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-md bg-[#F05224] shrink-0 size-12 text-white">
            <svg fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{expense.group_name}</h3>
            {expense.group_description && (
              <p className="text-sm text-gray-600 mt-1">{expense.group_description}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Created by {expense.created_by_name} • {formatDate(expense.created_at)}
            </p>
          </div>
        </div>
        
        <Badge className={`${getStatusColor()} font-medium px-3 py-1`}>
          {getStatusText()}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-lg font-bold text-gray-900">${expense.total_amount.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Your Share</p>
          <p className="text-lg font-bold text-gray-900">${expense.amount_owed.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Paid:</span>
            <span className="text-sm font-semibold text-emerald-600">
              ${expense.amount_paid.toFixed(2)}
            </span>
          </div>
          {!isSettled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Remaining:</span>
              <span className="text-sm font-semibold text-orange-600">
                ${remainingAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${expense.amount_owed > 0 ? Math.min((expense.amount_paid / expense.amount_owed) * 100, 100) : 0}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {expense.amount_owed > 0 ? ((expense.amount_paid / expense.amount_owed) * 100).toFixed(0) : '0'}% paid
          </p>
        </div>
      </div>

      {!isSettled && remainingAmount > 0 && expense.amount_owed > 0 && !hasPendingSettlement && (
        <Button 
          onClick={() => onSettleUp(expense.group_id)}
          className="w-full bg-[#F05224] hover:bg-[#D63E1A] text-white font-semibold py-2 px-4 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000]"
        >
          Settle Up ${remainingAmount.toFixed(2)}
        </Button>
      )}

      {hasPendingSettlement && (
        <div className="w-full text-center py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <span className="text-yellow-700 font-medium">⏳ Settlement Pending Review</span>
        </div>
      )}

      {/* Participants Section */}
      {expense.participants && expense.participants.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Participants</h4>
          <div className="space-y-2">
            {expense.participants.map((participant) => (
              <div key={participant.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full bg-gray-200 bg-cover bg-center"
                    style={{
                      backgroundImage: participant.profile_picture
                        ? `url("${participant.profile_picture}")`
                        : 'url("/placeholder.svg?height=32&width=32")'
                    }}
                  />
                  <div>
                    <span className="text-sm font-medium">
                      {participant.name}
                      {participant.is_creator && <span className="text-xs text-blue-600 ml-1">(Creator)</span>}
                    </span>
                    <div className="text-xs text-gray-500">
                      Owes: ${participant.amount_owed.toFixed(2)} | Paid: ${participant.amount_paid.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Payment Status & Controls */}
                <div className="flex items-center gap-2">
                  {participant.is_settled ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      ✓ Settled
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        ${(participant.amount_owed - participant.amount_paid).toFixed(2)} left
                      </span>
                      
                      {/* Creator can mark others as paid */}
                      {expense.created_by_name && currentUserId && participant.user_id !== currentUserId && onMarkPaid && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onMarkPaid(expense.group_id, participant.user_id, true)}
                            className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600"
                            title="Mark as paid"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => onMarkPaid(expense.group_id, participant.user_id, false)}
                            className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500"
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
        <div className="w-full text-center py-2 px-4 bg-emerald-50 border border-emerald-200 rounded-md mt-4">
          <span className="text-emerald-700 font-medium flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            All settled up!
          </span>
        </div>
      )}
    </div>
  )
}