"use client"

import { useState } from "react"
import Image from "next/image"
import { ExpenseSummary } from "@/types/expenses"

interface ExpenseDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  expense: ExpenseSummary
  currentUserId: string
  onMarkPaid?: (groupId: string, userId: string, paid: boolean) => void
}

export default function ExpenseDetailsModal({ 
  isOpen, 
  onClose, 
  expense, 
  currentUserId,
  onMarkPaid 
}: ExpenseDetailsModalProps) {
  const isCreator = currentUserId === expense.created_by_id
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
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

  // Calculate only from participants (excluding creator) for accurate "collected" metrics
  const participantsOnly = expense.participants?.filter(p => !p.is_creator) || []
  const totalPaidByParticipants = participantsOnly.reduce((sum, p) => sum + p.amount_paid, 0)
  const totalOwedByParticipants = participantsOnly.reduce((sum, p) => sum + p.amount_owed, 0) 
  const pendingAmount = totalOwedByParticipants - totalPaidByParticipants
  
  // For display purposes - total including creator
  const totalPaid = expense.participants?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
  const totalOwed = expense.participants?.reduce((sum, p) => sum + p.amount_owed, 0) || 0
  const settledCount = expense.participants?.filter(p => p.is_settled).length || 0
  const totalParticipants = expense.participants?.length || 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="roomeo-card max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-xl bg-emerald-primary shrink-0 size-16 text-3xl">
                {getCategoryEmoji(expense.group_name)}
              </div>
              <div>
                <h2 className="roomeo-heading text-2xl">{expense.group_name}</h2>
                {expense.group_description && (
                  <p className="roomeo-body text-emerald-primary/60 text-sm mt-1">{expense.group_description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-emerald-primary/50">
                  <span>Created by {expense.created_by_name}</span>
                  <span>•</span>
                  <span>{formatDate(expense.created_at)}</span>
                  {expense.event_id && (
                    <>
                      <span>•</span>
                      <span className="bg-gold-accent/20 text-gold-accent px-2 py-1 rounded-full font-medium">
                        🎉 Event Room
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="roomeo-interactive text-emerald-primary/60 hover:text-emerald-primary hover:no-underline p-2 rounded-lg hover:bg-sage/10"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-mint-cream rounded-xl border border-sage/20 text-center">
              <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-2">Total Amount</p>
              <p className="roomeo-heading text-2xl text-emerald-primary">${expense.total_amount.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-mint-cream rounded-xl border border-sage/20 text-center">
              <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-2">Participants</p>
              <p className="roomeo-heading text-2xl text-emerald-primary">{totalParticipants}</p>
            </div>
            <div className="p-4 bg-roomeo-success/10 rounded-xl border border-roomeo-success/20 text-center">
              <p className="roomeo-body text-roomeo-success text-xs uppercase tracking-wide mb-2">Collected</p>
              <p className="roomeo-heading text-2xl text-roomeo-success">${totalPaidByParticipants.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-roomeo-danger/10 rounded-xl border border-roomeo-danger/20 text-center">
              <p className="roomeo-body text-roomeo-danger text-xs uppercase tracking-wide mb-2">Pending</p>
              <p className="roomeo-heading text-2xl text-roomeo-danger">${pendingAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="mb-6 p-5 bg-gradient-to-r from-gold-accent/5 to-emerald-primary/5 rounded-xl border border-gold-accent/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="roomeo-heading text-lg flex items-center gap-2">
                <span>📊</span> Payment Progress
              </h3>
              <div className="text-sm text-emerald-primary/70">
                {settledCount} of {totalParticipants} settled
              </div>
            </div>
            
            <div className="w-full bg-sage/30 rounded-full h-4 mb-2">
              <div 
                className="bg-gradient-to-r from-moss-green to-roomeo-success h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                style={{ 
                  width: `${totalOwedByParticipants > 0 ? Math.min((totalPaidByParticipants / totalOwedByParticipants) * 100, 100) : 0}%`
                }}
              >
                {totalPaidByParticipants > 0 && (
                  <span className="text-white text-xs font-bold">
                    {totalOwedByParticipants > 0 ? ((totalPaidByParticipants / totalOwedByParticipants) * 100).toFixed(0) : '0'}%
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-emerald-primary/60">
              <span>${totalPaidByParticipants.toFixed(2)} collected</span>
              <span>${totalOwedByParticipants.toFixed(2)} owed by participants</span>
            </div>
          </div>

          {/* Participants List */}
          {expense.participants && expense.participants.length > 0 && (
            <div className="mb-6">
              <h3 className="roomeo-heading text-lg mb-4 flex items-center gap-2">
                <span>👥</span> Participants ({totalParticipants})
              </h3>
              <div className="space-y-3">
                {expense.participants
                  .sort((a, b) => {
                    // Sort: creators first, then by settlement status, then by name
                    if (a.is_creator && !b.is_creator) return -1
                    if (!a.is_creator && b.is_creator) return 1
                    if (a.is_settled !== b.is_settled) return a.is_settled ? 1 : -1
                    return a.name.localeCompare(b.name)
                  })
                  .map((participant) => {
                    const remainingOwed = participant.amount_owed - participant.amount_paid
                    const progressPercent = participant.amount_owed > 0 ? 
                      Math.min((participant.amount_paid / participant.amount_owed) * 100, 100) : 0

                    return (
                      <div key={participant.user_id} 
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                          participant.is_settled 
                            ? 'bg-roomeo-success/10 border-roomeo-success/20' 
                            : participant.is_creator
                            ? 'bg-gold-accent/10 border-gold-accent/20'
                            : 'bg-sage/10 border-sage/20 hover:bg-sage/20'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className="w-12 h-12 rounded-full bg-sage/30 bg-cover bg-center border-2 border-white shadow-sm shrink-0"
                            style={{
                              backgroundImage: participant.profile_picture
                                ? `url("${participant.profile_picture}")`
                                : 'url("/placeholder.svg?height=48&width=48")'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="roomeo-body font-semibold text-emerald-primary truncate">
                                {participant.name}
                              </span>
                              {participant.is_creator && (
                                <span className="text-xs bg-gold-accent text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                                  👑 Creator
                                </span>
                              )}
                              {participant.is_settled && (
                                <span className="text-xs bg-roomeo-success text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                                  ✅ Settled
                                </span>
                              )}
                            </div>
                            
                            {/* Progress bar for each participant */}
                            <div className="w-full bg-sage/30 rounded-full h-2 mb-2">
                              <div 
                                className="bg-gradient-to-r from-moss-green to-roomeo-success h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-emerald-primary/60">Share: </span>
                                <span className="font-medium text-emerald-primary">${participant.amount_owed.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-emerald-primary/60">Paid: </span>
                                <span className="font-medium text-roomeo-success">${participant.amount_paid.toFixed(2)}</span>
                              </div>
                              {!participant.is_settled && (
                                <div>
                                  <span className="text-emerald-primary/60">Owes: </span>
                                  <span className="font-medium text-roomeo-danger">${remainingOwed.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Creator Actions */}
                        {isCreator && participant.user_id !== currentUserId && onMarkPaid && (
                          <div className="flex items-center gap-2 ml-4">
                            {participant.is_settled ? (
                              <button
                                onClick={() => onMarkPaid(expense.group_id, participant.user_id, false)}
                                className="roomeo-interactive text-xs bg-sage text-emerald-primary px-3 py-1.5 rounded-lg hover:bg-sage/80 hover:no-underline transition-colors"
                                title="Mark as unpaid"
                              >
                                Mark Unpaid
                              </button>
                            ) : (
                              <button
                                onClick={() => onMarkPaid(expense.group_id, participant.user_id, true)}
                                className="roomeo-interactive text-xs bg-roomeo-success text-white px-3 py-1.5 rounded-lg hover:bg-roomeo-success/80 hover:no-underline transition-colors"
                                title="Mark as paid"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Summary for Creator */}
          {isCreator && (
            <div className="mb-6 p-5 bg-gradient-to-r from-emerald-primary/5 to-gold-accent/5 rounded-xl border border-emerald-primary/20">
              <h3 className="roomeo-heading text-lg mb-4 flex items-center gap-2">
                <span>👑</span> Creator Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-white rounded-lg">
                  <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-1">You Paid</p>
                  <p className="roomeo-heading text-xl text-emerald-primary">${expense.amount_paid.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-1">Your Fair Share</p>
                  <p className="roomeo-heading text-xl text-emerald-primary">${expense.amount_owed.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-1">Net Position</p>
                  <p className="roomeo-heading text-xl text-roomeo-success">
                    +${(expense.amount_paid - expense.amount_owed).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="text-center">
            {pendingAmount <= 0.01 ? (
              <div className="p-6 bg-roomeo-success/10 border border-roomeo-success/20 rounded-xl">
                <span className="roomeo-body text-roomeo-success font-semibold flex items-center justify-center gap-3 text-xl">
                  <span className="text-3xl">🎉</span>
                  All payments settled!
                </span>
              </div>
            ) : (
              <div className="p-6 bg-gold-accent/10 border border-gold-accent/20 rounded-xl">
                <span className="roomeo-body text-emerald-primary font-semibold flex items-center justify-center gap-3 text-lg">
                  <span className="text-2xl">⏳</span>
                  ${pendingAmount.toFixed(2)} still pending from {totalParticipants - settledCount} participants
                </span>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-center mt-6 pt-6 border-t border-sage/20">
            <button
              onClick={onClose}
              className="roomeo-button-primary flex items-center gap-2 px-8"
            >
              <span>👍</span> Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}