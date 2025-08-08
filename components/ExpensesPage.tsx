"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useFriends } from "@/hooks/useFriends"
import ExpenseCard from "./expenses/ExpenseCard"
import SettlementCard from "./expenses/SettlementCard"
import CreateExpenseModal from "./expenses/CreateExpenseModal"
import SettlementModal from "./expenses/SettlementModal"
import SettlementHistory from "./expenses/SettlementHistory"
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
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
      <div className="bg-white text-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F05224] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-white min-h-screen overflow-y-auto">
            <div className="mx-auto max-w-6xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-black tracking-tight mb-2 transform -skew-x-2">SPLITWISE</h1>
                  <div className="w-20 h-2 bg-[#F05224] transform skew-x-12"></div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex w-full sm:w-auto min-w-[84px] items-center justify-center gap-2 rounded-md bg-[#F05224] px-4 sm:px-6 py-3 text-xs sm:text-sm font-black text-white border-2 sm:border-4 border-black shadow-[2px_2px_0px_0px_#000000] sm:shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0px_0px_#000000] sm:hover:shadow-[2px_2px_0px_0px_#000000] hover:bg-[#D63E1A]"
                  >
                    <svg
                      fill="currentColor"
                      height="14"
                      viewBox="0 0 24 24"
                      width="14"
                      xmlns="http://www.w3.org/2000/svg"
                      className="sm:w-4 sm:h-4"
                    >
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    CREATE ROOM
                  </Button>
                  
                  <Button 
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex w-full sm:w-auto min-w-[84px] items-center justify-center gap-2 rounded-md bg-black px-4 sm:px-6 py-3 text-xs sm:text-sm font-black text-white border-2 sm:border-4 border-[#F05224] shadow-[2px_2px_0px_0px_#F05224] sm:shadow-[4px_4px_0px_0px_#F05224] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0px_0px_#F05224] sm:hover:shadow-[2px_2px_0px_0px_#F05224] hover:bg-gray-800"
                  >
                    <svg
                      fill="currentColor"
                      height="14"
                      viewBox="0 0 24 24"
                      width="14"
                      xmlns="http://www.w3.org/2000/svg"
                      className="sm:w-4 sm:h-4"
                    >
                      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                    HISTORY
                  </Button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                  <button 
                    onClick={() => setError('')}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Balance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Your Balance</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
                          style={{
                            backgroundImage: `url("${user?.profilePicture || "/placeholder.svg?height=48&width=48"}")`,
                          }}
                        ></div>
                        <div>
                          <p className="font-semibold text-gray-800">Total</p>
                          <p className={`text-sm font-medium ${
                            dashboardData.total_owed > 0 ? 'text-orange-600' : 'text-emerald-500'
                          }`}>
                            {dashboardData.total_owed > 0 
                              ? `You owe $${dashboardData.total_owed.toFixed(2)}`
                              : 'All settled up!'
                            }
                          </p>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${
                        dashboardData.total_owed > 0 ? 'text-orange-600' : 'text-emerald-500'
                      }`}>
                        {dashboardData.total_owed > 0 ? '-' : ''}$
                        {dashboardData.total_owed.toFixed(2)}
                      </p>
                    </div>
                    
                    {dashboardData.total_to_receive > 0 && (
                      <>
                        <hr className="my-2 border-gray-200" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">Pending Approvals</p>
                            <p className="text-sm text-blue-600 font-medium">
                              ${dashboardData.total_to_receive.toFixed(2)} awaiting review
                            </p>
                          </div>
                          <p className="text-lg font-bold text-blue-600">
                            +${dashboardData.total_to_receive.toFixed(2)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Expenses</span>
                      <span className="font-medium">{dashboardData.active_expenses.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pending Settlements</span>
                      <span className="font-medium">{dashboardData.pending_settlements.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Friends Available</span>
                      <span className="font-medium">{friends.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Expenses */}
              {dashboardData.active_expenses.length > 0 ? (
                <section className="mb-10">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Active Expenses</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {dashboardData.active_expenses.map((expense) => (
                      <ExpenseCard
                        key={expense.group_id}
                        expense={expense}
                        onSettleUp={handleSettleUp}
                        currentUserId={user.id}
                        onMarkPaid={handleMarkPaid}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="text-center py-12 mb-10">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active expenses</h3>
                  <p className="text-gray-600 mb-6">Start splitting expenses with your friends!</p>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#F05224] hover:bg-[#D63E1A] text-white font-semibold px-6 py-2 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000]"
                  >
                    Create Your First Room
                  </Button>
                </div>
              )}

              {/* Pending Settlements */}
              {dashboardData.pending_settlements.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Pending Settlements</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {dashboardData.pending_settlements.map((settlement) => (
                      <SettlementCard
                        key={settlement.settlement_id}
                        settlement={settlement}
                        onApprove={handleApproveSettlement}
                        currentUserId={user.id}
                      />
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

      <SettlementHistory
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  )
}
