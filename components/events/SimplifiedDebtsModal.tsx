"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { EventWithDetails } from "@/types/events"

interface SimplifiedDebt {
  from: string
  to: string
  amount: number
  fromName: string
  toName: string
  fromPicture?: string
  toPicture?: string
}

interface SimplifiedDebtsModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventWithDetails
  currentUserId: string
  onSettleNow?: (debts: SimplifiedDebt[]) => Promise<void>
}

export default function SimplifiedDebtsModal({
  isOpen,
  onClose,
  event,
  currentUserId,
  onSettleNow
}: SimplifiedDebtsModalProps) {
  const [isSettling, setIsSettling] = useState(false)

  // Debt simplification algorithm
  const { simplifiedDebts, totalPayments, originalPayments } = useMemo(() => {
    // Step 1: Calculate net balances for each user across all event rooms
    const userBalances = new Map<string, number>()
    const userInfo = new Map<string, { name: string, picture?: string }>()
    
    // Initialize user info from event members
    event.members.forEach(member => {
      userBalances.set(member.user_id, 0)
      userInfo.set(member.user_id, {
        name: member.name,
        picture: member.profile_picture
      })
    })

    let originalTransactionCount = 0

    // Calculate balances across all rooms
    event.rooms.forEach(room => {
      if (!room.participants) return

      room.participants.forEach(participant => {
        const userId = participant.user_id
        const owes = Math.max(0, participant.amount_owed - participant.amount_paid)
        
        if (owes > 0) {
          originalTransactionCount++
          // This user owes money to the room creator
          const currentBalance = userBalances.get(userId) || 0
          userBalances.set(userId, currentBalance - owes)
          
          // Room creator is owed this money
          const creatorBalance = userBalances.get(room.created_by_id) || 0
          userBalances.set(room.created_by_id, creatorBalance + owes)
        }
      })
    })

    // Step 2: Simplify debts using greedy algorithm
    const debts: SimplifiedDebt[] = []
    const debtors: Array<{ userId: string, amount: number }> = []
    const creditors: Array<{ userId: string, amount: number }> = []

    // Separate debtors and creditors
    userBalances.forEach((balance, userId) => {
      if (balance < -0.01) { // They owe money
        debtors.push({ userId, amount: Math.abs(balance) })
      } else if (balance > 0.01) { // They are owed money
        creditors.push({ userId, amount: balance })
      }
    })

    // Sort for optimal matching
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    // Greedy matching algorithm
    let debtorIndex = 0
    let creditorIndex = 0

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex]
      const creditor = creditors[creditorIndex]
      
      const transferAmount = Math.min(debtor.amount, creditor.amount)
      
      if (transferAmount > 0.01) {
        const debtorInfo = userInfo.get(debtor.userId)
        const creditorInfo = userInfo.get(creditor.userId)
        
        debts.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: transferAmount,
          fromName: debtorInfo?.name || 'Unknown',
          toName: creditorInfo?.name || 'Unknown',
          fromPicture: debtorInfo?.picture,
          toPicture: creditorInfo?.picture
        })
      }

      // Update remaining amounts
      debtor.amount -= transferAmount
      creditor.amount -= transferAmount

      // Move to next debtor/creditor if current one is settled
      if (debtor.amount < 0.01) debtorIndex++
      if (creditor.amount < 0.01) creditorIndex++
    }

    return {
      simplifiedDebts: debts,
      totalPayments: debts.length,
      originalPayments: originalTransactionCount
    }
  }, [event])

  const handleSettleNow = async () => {
    if (!onSettleNow) return
    
    try {
      setIsSettling(true)
      await onSettleNow(simplifiedDebts)
      onClose()
    } catch (error) {
      console.error('Error settling debts:', error)
    } finally {
      setIsSettling(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-mint-cream rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage/20 flex-shrink-0">
          <div>
            <h2 className="roomeo-heading text-xl text-emerald-primary">
              🔄 Simplified Debts
            </h2>
            <p className="roomeo-body text-emerald-primary/70 text-sm">
              Optimized payment plan for &quot;{event.name}&quot;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-primary/70 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Efficiency Info */}
          <div className="mb-6 p-4 bg-emerald-primary/10 border-2 border-emerald-primary/20 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="roomeo-heading text-sm text-emerald-primary">
                  Payment Optimization
                </h3>
                <p className="text-xs text-emerald-primary/70">
                  Reduced complexity through debt consolidation
                </p>
              </div>
            </div>
            <div className="bg-white/50 p-3 rounded-lg">
              <p className="roomeo-body text-sm text-emerald-primary">
                ✅ <span className="font-bold text-roomeo-success">{totalPayments} payments needed</span> instead of <span className="font-bold text-alert-red">{originalPayments}</span>
              </p>
              {totalPayments < originalPayments && (
                <p className="text-xs text-emerald-primary/60 mt-1">
                  Saved {originalPayments - totalPayments} transactions!
                </p>
              )}
            </div>
          </div>

          {/* Simplified Debts List */}
          <div>
            <h3 className="roomeo-heading text-sm text-emerald-primary mb-4">
              💸 Required Payments ({totalPayments})
            </h3>
            
            {simplifiedDebts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎉</div>
                <h4 className="roomeo-heading text-lg text-emerald-primary mb-2">
                  All Settled Up!
                </h4>
                <p className="roomeo-body text-emerald-primary/60 text-sm">
                  No payments needed across this event
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {simplifiedDebts.map((debt, index) => (
                  <div
                    key={`${debt.from}-${debt.to}-${index}`}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      debt.from === currentUserId || debt.to === currentUserId
                        ? 'border-emerald-primary/30 bg-emerald-primary/5'
                        : 'border-sage/20 bg-sage/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* From User */}
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-full bg-sage/30 bg-cover bg-center flex-shrink-0"
                          style={{
                            backgroundImage: debt.fromPicture 
                              ? `url("${debt.fromPicture}")` 
                              : undefined
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`roomeo-body text-sm font-medium truncate ${
                            debt.from === currentUserId ? 'text-alert-red' : 'text-emerald-primary'
                          }`}>
                            {debt.from === currentUserId ? 'You' : debt.fromName}
                          </p>
                        </div>
                      </div>

                      {/* Arrow and Amount */}
                      <div className="flex items-center gap-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-primary/50">→</span>
                          <span className="roomeo-body text-lg font-bold text-emerald-primary">
                            ${debt.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* To User */}
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <div className="min-w-0 flex-1 text-right">
                          <p className={`roomeo-body text-sm font-medium truncate ${
                            debt.to === currentUserId ? 'text-roomeo-success' : 'text-emerald-primary'
                          }`}>
                            {debt.to === currentUserId ? 'You' : debt.toName}
                          </p>
                        </div>
                        <div
                          className="w-8 h-8 rounded-full bg-sage/30 bg-cover bg-center flex-shrink-0"
                          style={{
                            backgroundImage: debt.toPicture 
                              ? `url("${debt.toPicture}")` 
                              : undefined
                          }}
                        />
                      </div>
                    </div>

                    {/* User involvement indicator */}
                    {(debt.from === currentUserId || debt.to === currentUserId) && (
                      <div className="mt-2 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          debt.from === currentUserId 
                            ? 'bg-alert-red/20 text-alert-red' 
                            : 'bg-roomeo-success/20 text-roomeo-success'
                        }`}>
                          {debt.from === currentUserId ? 'You pay this' : 'You receive this'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-sage/20 flex-shrink-0">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 roomeo-button-secondary"
            disabled={isSettling}
          >
            Close
          </Button>
          {simplifiedDebts.length > 0 && onSettleNow && (
            <Button
              onClick={handleSettleNow}
              className="flex-1 roomeo-button-primary"
              disabled={isSettling}
            >
              {isSettling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                  Settling...
                </>
              ) : (
                <>
                  💰 Settle Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}