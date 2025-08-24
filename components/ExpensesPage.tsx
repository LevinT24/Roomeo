"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useFriends } from "@/hooks/useFriends"
import ExpenseCard from "./expenses/ExpenseCard"
import SettlementCard from "./expenses/SettlementCard"
import CreateExpenseModal from "./expenses/CreateExpenseModal"
import SettlementModal from "./expenses/SettlementModal"
import { 
  ExpenseDashboardData, 
  ExpenseSummary, 
  CreateExpenseGroupRequest,
  SubmitSettlementRequest 
} from "@/types/expenses"
import { 
  createExpenseGroup, 
  getExpenseDashboardData, 
  submitSettlement, 
  approveSettlement,
  markParticipantPayment 
} from "@/services/expenses"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

interface ExpensesPageProps {
  user: User
}

export default function ExpensesPage({ user }: ExpensesPageProps) {
  const [dashboardData, setDashboardData] = useState<ExpenseDashboardData>({
    active_expenses: [],
    pending_settlements: [],
    total_owed: 0,
    total_to_receive: 0
  })
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const { friends } = useFriends()

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const dashboardData = await getExpenseDashboardData()
      setDashboardData(dashboardData)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load expenses')
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Create expense group
  const handleCreateExpense = async (data: CreateExpenseGroupRequest) => {
    try {
      const result = await createExpenseGroup(data)
      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData()
      } else {
        throw new Error(result.message || 'Failed to create expense group')
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create expense group')
    }
  }

  // Handle settle up
  const handleSettleUp = (groupId: string) => {
    const expense = dashboardData.active_expenses.find(exp => exp.group_id === groupId)
    if (expense) {
      setSelectedExpense(expense)
      setIsSettlementModalOpen(true)
    }
  }

  // Submit settlement
  const handleSubmitSettlement = async (data: SubmitSettlementRequest) => {
    try {
      const result = await submitSettlement(data)
      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData()
      } else {
        throw new Error(result.message || 'Failed to submit settlement')
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to submit settlement')
    }
  }

  // Approve/reject settlement
  const handleApproveSettlement = async (settlementId: string, approved: boolean) => {
    try {
      const result = await approveSettlement({
        settlement_id: settlementId,
        approved: approved
      })
      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData()
      } else {
        throw new Error(result.message || `Failed to ${approved ? 'approve' : 'reject'} settlement`)
      }
    } catch (err) {
      console.error('Error processing settlement:', err)
      setError(err instanceof Error ? err.message : 'Failed to process settlement')
    }
  }

  // Mark participant as paid/unpaid (creator only)
  const handleMarkPaid = async (groupId: string, userId: string, paid: boolean) => {
    try {
      console.log('Mark paid:', { groupId, userId, paid })
      
      const result = await markParticipantPayment(groupId, userId, paid)
      if (result.success) {
        // Refresh dashboard data to show updated payment status
        await fetchDashboardData()
      } else {
        throw new Error(result.message || `Failed to mark participant as ${paid ? 'paid' : 'unpaid'}`)
      }
    } catch (err) {
      console.error('Error marking payment status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update payment status')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
          <p className="roomeo-body text-emerald-primary/70 text-lg">Loading your expenses... 💸</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-mint-cream min-h-screen">
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-mint-cream min-h-screen overflow-y-auto">
            <div className="mx-auto max-w-6xl animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="animate-slide-up">
                  <h1 className="roomeo-heading text-4xl mb-2">💸 Expense Tracker</h1>
                  <p className="roomeo-body text-emerald-primary/70">Split bills with friends seamlessly</p>
                </div>

                <div className="flex gap-3 animate-slide-up">
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="roomeo-button-primary flex items-center gap-2"
                  >
                    <span>➕</span>
                    <span>Create Room</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-5 bg-alert-red/10 border border-alert-red/20 rounded-xl text-alert-red animate-slide-up">
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

              {/* Balance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="roomeo-card p-6 animate-slide-up">
                  <h2 className="roomeo-heading text-lg mb-4">💰 Your Balance</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-sage/30"
                          style={{
                            backgroundImage: `url("${user?.profilePicture || "/placeholder.svg?height=48&width=48"}")`,
                          }}
                        ></div>
                        <div>
                          <p className="roomeo-body font-semibold">Total</p>
                          <p className={`roomeo-body text-sm font-medium ${
                            dashboardData.total_owed > 0 ? 'text-roomeo-danger' : 'text-roomeo-success'
                          }`}>
                            {dashboardData.total_owed > 0 
                              ? `You owe $${dashboardData.total_owed.toFixed(2)}`
                              : 'All settled up! 🎉'
                            }
                          </p>
                        </div>
                      </div>
                      <p className={`text-xl font-bold ${
                        dashboardData.total_owed > 0 ? 'text-roomeo-danger' : 'text-roomeo-success'
                      }`}>
                        {dashboardData.total_owed > 0 ? '-' : ''}$
                        {dashboardData.total_owed.toFixed(2)}
                      </p>
                    </div>
                    
                    {dashboardData.total_to_receive > 0 && (
                      <>
                        <hr className="my-2 border-sage/20" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="roomeo-body font-semibold">Pending Approvals</p>
                            <p className="roomeo-body text-sm text-gold-accent font-medium">
                              ${dashboardData.total_to_receive.toFixed(2)} awaiting review
                            </p>
                          </div>
                          <p className="text-xl font-bold text-gold-accent">
                            +${dashboardData.total_to_receive.toFixed(2)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="roomeo-card p-6 animate-slide-up">
                  <h2 className="roomeo-heading text-lg mb-4">📊 Summary</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
                      <span className="roomeo-body text-emerald-primary/70">🏠 Active Rooms</span>
                      <span className="roomeo-body font-semibold text-emerald-primary">{dashboardData.active_expenses.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gold-accent/10 rounded-lg">
                      <span className="roomeo-body text-emerald-primary/70">⏳ Pending Settlements</span>
                      <span className="roomeo-body font-semibold text-emerald-primary">{dashboardData.pending_settlements.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-moss-green/10 rounded-lg">
                      <span className="roomeo-body text-emerald-primary/70">👥 Friends Available</span>
                      <span className="roomeo-body font-semibold text-emerald-primary">{friends.length}</span>
                    </div>
                  </div>
                </div>

                <div className="roomeo-card p-6 animate-slide-up">
                  <h2 className="roomeo-heading text-lg mb-4">💰 You Owe</h2>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {(() => {
                      const friendDebts = new Map<string, { name: string, amount: number, profilePicture?: string }>()
                      
                      dashboardData.active_expenses.forEach(expense => {
                        const userParticipant = expense.participants?.find(p => p.user_id === user.id)
                        if (userParticipant && userParticipant.amount_owed > userParticipant.amount_paid) {
                          const owedAmount = userParticipant.amount_owed - userParticipant.amount_paid
                          const creatorName = expense.created_by_name || 'Unknown'
                          const existing = friendDebts.get(expense.group_id)
                          friendDebts.set(expense.group_id, {
                            name: `${creatorName} (${expense.group_name})`,
                            amount: owedAmount,
                            profilePicture: undefined
                          })
                        }
                      })

                      const friendDebtArray = Array.from(friendDebts.entries()).map(([userId, data]) => ({ userId, ...data }))
                      
                      if (friendDebtArray.length === 0) {
                        return (
                          <div className="text-center py-4">
                            <p className="roomeo-body text-emerald-primary/60">All settled up! 🎉</p>
                          </div>
                        )
                      }

                      return friendDebtArray.map(({ userId, name, amount, profilePicture }) => (
                        <div key={userId} className="flex items-center justify-between p-3 bg-alert-red/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border border-sage/30"
                              style={{
                                backgroundImage: `url("${profilePicture || "/placeholder.svg?height=32&width=32"}")`,
                              }}
                            ></div>
                            <span className="roomeo-body text-sm font-medium">{name}</span>
                          </div>
                          <span className="roomeo-body text-sm font-bold text-alert-red">
                            ${amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                <div className="roomeo-card p-6 animate-slide-up">
                  <h2 className="roomeo-heading text-lg mb-4">💸 Friends Owe You</h2>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {(() => {
                      const friendOwes = new Map<string, { name: string, amount: number, profilePicture?: string }>()
                      
                      dashboardData.active_expenses.forEach(expense => {
                        expense.participants?.forEach(participant => {
                          if (participant.user_id !== user.id && participant.amount_owed > participant.amount_paid) {
                            const oweAmount = participant.amount_owed - participant.amount_paid
                            const existing = friendOwes.get(participant.user_id)
                            friendOwes.set(participant.user_id, {
                              name: participant.name,
                              amount: (existing?.amount || 0) + oweAmount,
                              profilePicture: participant.profile_picture
                            })
                          }
                        })
                      })

                      const friendOweArray = Array.from(friendOwes.entries()).map(([userId, data]) => ({ userId, ...data }))
                      
                      if (friendOweArray.length === 0) {
                        return (
                          <div className="text-center py-4">
                            <p className="roomeo-body text-emerald-primary/60">No pending payments 💯</p>
                          </div>
                        )
                      }

                      return friendOweArray.map(({ userId, name, amount, profilePicture }) => (
                        <div key={userId} className="flex items-center justify-between p-3 bg-roomeo-success/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border border-sage/30"
                              style={{
                                backgroundImage: `url("${profilePicture || "/placeholder.svg?height=32&width=32"}")`,
                              }}
                            ></div>
                            <span className="roomeo-body text-sm font-medium">{name}</span>
                          </div>
                          <span className="roomeo-body text-sm font-bold text-roomeo-success">
                            ${amount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>

              {/* Active Expenses */}
              {dashboardData.active_expenses.length > 0 ? (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="roomeo-heading text-2xl">🏠 Active Rooms</h2>
                    <div className="flex gap-2">
                      <button className="text-xs px-3 py-1.5 rounded-full bg-emerald-primary text-gold-accent shadow-soft">🍕 All</button>
                      <button className="text-xs px-3 py-1.5 rounded-full bg-sage/20 text-emerald-primary hover:bg-sage/30 transition-colors">🏠 House</button>
                      <button className="text-xs px-3 py-1.5 rounded-full bg-sage/20 text-emerald-primary hover:bg-sage/30 transition-colors">🚕 Travel</button>
                      <button className="text-xs px-3 py-1.5 rounded-full bg-sage/20 text-emerald-primary hover:bg-sage/30 transition-colors">🎮 Fun</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {dashboardData.active_expenses.map((expense, index) => (
                      <div key={expense.group_id} className="animate-on-scroll" style={{animationDelay: `${index * 100}ms`}}>
                        <ExpenseCard
                          expense={expense}
                          onSettleUp={handleSettleUp}
                          currentUserId={user.id}
                          onMarkPaid={handleMarkPaid}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="roomeo-card text-center py-16 mb-10 animate-slide-up">
                  <div className="text-6xl mb-4">💸</div>
                  <h3 className="roomeo-heading text-xl mb-2">No active expenses</h3>
                  <p className="roomeo-body text-emerald-primary/60 mb-8">Start splitting expenses with your friends!</p>
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="roomeo-button-primary"
                  >
                    <span>🚀</span> Create Your First Room
                  </button>
                </div>
              )}

              {/* Pending Settlements */}
              {dashboardData.pending_settlements.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="roomeo-heading text-2xl">⏳ Pending Settlements</h2>
                    <div className="flex items-center gap-2">
                      <div className="text-xs px-3 py-1.5 rounded-full bg-gold-accent/20 text-gold-accent font-medium">
                        💳 Payment Required
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {dashboardData.pending_settlements.map((settlement, index) => (
                      <div key={settlement.settlement_id} className="animate-on-scroll" style={{animationDelay: `${index * 100}ms`}}>
                        <SettlementCard
                          settlement={settlement}
                          onApprove={handleApproveSettlement}
                          currentUserId={user.id}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        friends={friends.map(f => ({ 
          id: f.friendId, 
          name: f.name, 
          profilePicture: f.profilePicture || undefined 
        }))}
        onCreateExpense={handleCreateExpense}
      />

      {selectedExpense && (
        <SettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => {
            setIsSettlementModalOpen(false)
            setSelectedExpense(null)
          }}
          expense={selectedExpense}
          onSubmitSettlement={handleSubmitSettlement}
        />
      )}
    </div>
  )
}
