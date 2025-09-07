// components/events/EventRoomView.tsx
// CRITICAL: This component reuses the EXACT same Room UI as standalone rooms
// The UI must be identical - no simplified or alternate view

"use client"

import { useState, useEffect } from "react"
import { ExpenseSummary, SubmitSettlementRequest } from "@/types/expenses"
import { getRoomDetailsById, submitSettlement, markParticipantPayment } from "@/services/expenses"

// Import existing components - REUSE EVERYTHING
import ExpenseCard from "../expenses/ExpenseCard"
import SettlementCard from "../expenses/SettlementCard"
import SettlementModal from "../expenses/SettlementModal"

interface User {
  id: string
  name: string
  profilePicture?: string
}

interface EventRoomViewProps {
  roomId: string
  eventId: string
  eventName?: string
  user: User
}

export default function EventRoomView({
  roomId,
  eventId,
  eventName,
  user
}: EventRoomViewProps) {
  const [roomData, setRoomData] = useState<ExpenseSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)

  // Fetch room data using room details by ID (includes all participants)
  const fetchRoomData = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Use new getRoomDetailsById to get complete room data including all participants
      const room = await getRoomDetailsById(roomId)
      
      if (!room) {
        throw new Error('Room not found')
      }
      
      setRoomData(room)
    } catch (err) {
      console.error('Error fetching room data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load room data')
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on mount and when roomId changes
  useEffect(() => {
    if (roomId) {
      fetchRoomData()
    }
  }, [roomId])

  // Handle settle up - reuse existing logic
  const handleSettleUp = () => {
    if (roomData) {
      setIsSettlementModalOpen(true)
    }
  }

  // Submit settlement - reuse existing logic  
  const handleSubmitSettlement = async (data: SubmitSettlementRequest) => {
    try {
      const result = await submitSettlement(data)
      if (result.success) {
        await fetchRoomData() // Refresh data
        return result
      } else {
        throw new Error(result.message || 'Failed to submit settlement')
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to submit settlement')
    }
  }

  // Mark participant as paid - reuse existing logic
  const handleMarkPaid = async (groupId: string, userId: string, paid: boolean) => {
    try {
      const result = await markParticipantPayment(groupId, userId, paid)
      if (result.success) {
        await fetchRoomData() // Refresh data
      } else {
        throw new Error(result.message || 'Failed to update payment status')
      }
    } catch (err) {
      console.error('Error marking payment status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update payment status')
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
          <p className="roomeo-body text-emerald-primary/70 text-lg">Loading room details... 💸</p>
        </div>
      </div>
    )
  }

  if (error || !roomData) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4 opacity-50">⚠️</div>
          <h3 className="roomeo-heading text-xl text-emerald-primary mb-2">
            {error || 'Room not found'}
          </h3>
          <button
            onClick={fetchRoomData}
            className="roomeo-button-secondary"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-mint-cream">
      {/* Breadcrumb - shows Event > Room context */}
      <div className="sticky top-0 z-10 bg-mint-cream/90 backdrop-blur-sm border-b border-sage/20 p-4">
        <div className="flex items-center gap-2 text-sm text-emerald-primary/60">
          <span>{eventName || 'Event'}</span>
          <span>→</span>
          <span className="text-emerald-primary font-medium">{roomData.group_name}</span>
        </div>
      </div>

      {/* 🎯 CRITICAL: Use EXACT same Room UI as standalone Room */}
      <div className="p-6 pb-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-5 bg-alert-red/10 border border-alert-red/20 rounded-xl text-alert-red">
            <div className="flex items-center justify-between">
              <span className="roomeo-body font-medium">{error}</span>
              <button 
                onClick={() => setError('')}
                className="roomeo-interactive text-alert-red hover:no-underline ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* REUSE EXACT ExpenseCard - same as ExpensesPage.tsx */}
        <div className="mb-6">
          <ExpenseCard
            expense={roomData}
            onSettleUp={handleSettleUp}
            currentUserId={user.id}
            onMarkPaid={handleMarkPaid}
          />
        </div>

        {/* Pending Settlement Display - same as ExpensesPage.tsx */}
        {roomData.pending_settlement && (
          <div className="mb-6">
            <h3 className="roomeo-heading text-lg mb-4">⏳ Your Pending Settlement</h3>
            <SettlementCard
              settlement={{
                settlement_id: roomData.pending_settlement.settlement_id,
                group_name: roomData.group_name,
                payer_name: user.name,
                receiver_id: roomData.created_by_id || '',
                amount: roomData.pending_settlement.amount,
                payment_method: roomData.pending_settlement.payment_method,
                status: roomData.pending_settlement.status,
                created_at: roomData.pending_settlement.created_at
              }}
              currentUserId={user.id}
            />
          </div>
        )}

        {/* Additional room context info specific to events */}
        <div className="roomeo-card p-6 mb-6">
          <h3 className="roomeo-heading text-lg mb-4">📊 Room Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
              <span className="roomeo-body text-emerald-primary/70">💰 Total Amount</span>
              <span className="roomeo-body font-semibold text-emerald-primary">
                ${roomData.total_amount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
              <span className="roomeo-body text-emerald-primary/70">👥 Participants</span>
              <span className="roomeo-body font-semibold text-emerald-primary">
                {roomData.participants?.length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
              <span className="roomeo-body text-emerald-primary/70">📅 Created</span>
              <span className="roomeo-body font-semibold text-emerald-primary">
                {new Date(roomData.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
              <span className="roomeo-body text-emerald-primary/70">🏠 Status</span>
              <span className={`roomeo-body font-semibold ${
                roomData.is_settled ? 'text-roomeo-success' : 'text-gold-accent'
              }`}>
                {roomData.is_settled ? '✅ Settled' : '💰 Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Participants breakdown - enhanced view */}
        {roomData.participants && roomData.participants.length > 0 && (
          <div className="roomeo-card p-6">
            <h3 className="roomeo-heading text-lg mb-4">👥 Participants ({roomData.participants.length})</h3>
            <div className="space-y-3">
              {roomData.participants.map(participant => (
                <div key={participant.user_id} className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
                      style={{
                        backgroundImage: `url("${participant.profile_picture || "/placeholder.svg?height=40&width=40"}")`,
                      }}
                    />
                    <div>
                      <span className="roomeo-body font-medium text-emerald-primary">
                        {participant.name}
                        {participant.is_creator && ' 👑'}
                      </span>
                      <div className="text-xs text-emerald-primary/60">
                        Owes: ${participant.amount_owed.toFixed(2)} | 
                        Paid: ${participant.amount_paid.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      participant.amount_owed > participant.amount_paid 
                        ? 'text-alert-red' 
                        : 'text-roomeo-success'
                    }`}>
                      ${(participant.amount_owed - participant.amount_paid).toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-primary/60">
                      {participant.is_settled ? 'Settled' : 'Outstanding'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* REUSE EXACT SettlementModal - same as ExpensesPage.tsx */}
      {roomData && (
        <SettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          expense={roomData}
          onSubmitSettlement={handleSubmitSettlement}
        />
      )}
    </div>
  )
}