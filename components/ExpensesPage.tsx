"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useFriends } from "@/hooks/useFriends"
import ExpenseCard from "./expenses/ExpenseCard"
import SettlementCard from "./expenses/SettlementCard"
import CreateExpenseModal from "./expenses/CreateExpenseModal"
import SettlementModal from "./expenses/SettlementModal"
import ExpenseDetailsModal from "./expenses/ExpenseDetailsModal"
import SettlementHistory from "./expenses/SettlementHistory"
import NotificationsDropdown from "./NotificationsDropdown"
import ProofReviewDropdown from "./ProofReviewDropdown"
import CreateEventModal from "./events/CreateEventModal"
import EventCard from "./events/EventCard"
import EventModal from "./events/EventModal"
import DeleteConfirmationModal from "./DeleteConfirmationModal"
import { 
  ExpenseDashboardData, 
  ExpenseSummary, 
  CreateExpenseGroupRequest,
  SubmitSettlementRequest 
} from "@/types/expenses"
import { 
  EventListItem,
  CreateEventRequest
} from "@/types/events"
import { 
  createExpenseGroup, 
  getExpenseDashboardData, 
  submitSettlement, 
  approveSettlement,
  markParticipantPayment,
  getAllRooms,
  getRegularRooms,
  getEventRooms,
  getPendingSettlements,
  deleteExpenseGroup
} from "@/services/expenses"
import { 
  createEvent,
  getUserEvents 
} from "@/services/events"

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
  const router = useRouter()
  
  const [dashboardData, setDashboardData] = useState<ExpenseDashboardData>({
    active_expenses: [],
    pending_settlements: [],
    total_owed: 0,
    total_to_receive: 0
  })
  
  const [events, setEvents] = useState<EventListItem[]>([])
  const [allRooms, setAllRooms] = useState<ExpenseSummary[]>([])
  const [roomFilter, setRoomFilter] = useState<'all' | 'regular' | 'event'>('all')
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<ExpenseSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { friends } = useFriends()

  // Fetch dashboard data (both expenses and events)
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const [userEvents, allRoomsData, pendingSettlements] = await Promise.all([
        getUserEvents(),
        getAllRooms(), // Get all rooms with complete participant data
        getPendingSettlements() // Get pending settlements separately
      ])
      
      // Calculate dashboard totals from allRoomsData
      const total_owed = allRoomsData.reduce((sum, expense) => 
        sum + (expense.amount_owed - expense.amount_paid), 0
      );

      setDashboardData({
        active_expenses: allRoomsData, // Use all rooms for balance calculations
        pending_settlements: pendingSettlements,
        total_owed,
        total_to_receive: pendingSettlements.reduce((sum, settlement) => sum + settlement.amount, 0)
      })
      setEvents(userEvents)
      setAllRooms(allRoomsData) // Store all rooms for filtering
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter rooms based on selected filter - only show active rooms
  const getFilteredRooms = (): ExpenseSummary[] => {
    let filteredRooms: ExpenseSummary[]
    
    if (roomFilter === 'regular') {
      filteredRooms = allRooms.filter(room => !room.event_id)
    } else if (roomFilter === 'event') {
      filteredRooms = allRooms.filter(room => room.event_id)
    } else {
      filteredRooms = allRooms // 'all' filter
    }
    
    // Only return active rooms - settled rooms go to history
    return filteredRooms.filter(room => !room.is_settled)
  }

  // Handle filter change
  const handleFilterChange = (filter: 'all' | 'regular' | 'event') => {
    setRoomFilter(filter)
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

  // Create event
  const handleCreateEvent = async (data: CreateEventRequest) => {
    try {
      const result = await createEvent(data)
      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData()
      } else {
        throw new Error(result.message || 'Failed to create event')
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  // Handle event click - open event modal
  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId)
    setIsEventModalOpen(true)
  }

  // Handle settle up (for participants)
  const handleSettleUp = (groupId: string) => {
    const expense = dashboardData.active_expenses.find(exp => exp.group_id === groupId)
    if (expense) {
      setSelectedExpense(expense)
      setIsSettlementModalOpen(true)
    }
  }

  // Handle view details (for creators)
  const handleViewDetails = (groupId: string) => {
    const expense = dashboardData.active_expenses.find(exp => exp.group_id === groupId)
    if (expense) {
      setSelectedExpense(expense)
      setIsDetailsModalOpen(true)
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
      const result = await markParticipantPayment(groupId, userId, paid)
      if (result.success) {
        // Refresh dashboard data to show updated payment status
        await fetchDashboardData()
      } else {
        throw new Error(result.message || `Failed to mark participant as ${paid ? 'paid' : 'unpaid'}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status')
    }
  }

  // Delete room handlers
  const handleDeleteRoom = (groupId: string) => {
    const roomToDelete = allRooms.find(room => room.group_id === groupId)
    if (roomToDelete) {
      setRoomToDelete(roomToDelete)
      setIsDeleteModalOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return
    
    try {
      setIsDeleting(true)
      const result = await deleteExpenseGroup(roomToDelete.group_id)
      
      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData()
        setIsDeleteModalOpen(false)
        setRoomToDelete(null)
      } else {
        throw new Error(result.message || 'Failed to delete room')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false)
    setRoomToDelete(null)
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

                <div className="flex items-center gap-3 animate-slide-up">
                  <NotificationsDropdown userId={user.id} />
                  <ProofReviewDropdown userId={user.id} />
                  <button 
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="roomeo-button-secondary flex items-center gap-2"
                  >
                    <span>📊</span>
                    <span>History</span>
                  </button>
                  <button 
                    onClick={() => setIsCreateEventModalOpen(true)}
                    className="roomeo-button-secondary flex items-center gap-2"
                  >
                    <span>🎉</span>
                    <span>Create Event</span>
                  </button>
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
                    
                  </div>
                </div>

                <div className="roomeo-card p-6 animate-slide-up">
                  <h2 className="roomeo-heading text-lg mb-4">📊 Summary</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-sage/10 rounded-lg">
                      <span className="roomeo-body text-emerald-primary/70">🏠 Active Rooms</span>
                      <span className="roomeo-body font-semibold text-emerald-primary">{getFilteredRooms().length}</span>
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
                      
                      // Use dashboardData.active_expenses for balance calculations (has full participant data)
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
                      
                      // Use dashboardData.active_expenses for balance calculations (has full participant data)
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

              {/* Events Section */}
              {events.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="roomeo-heading text-2xl">🎉 Your Events</h2>
                    <div className="flex gap-2">
                      <button className="text-xs px-3 py-1.5 rounded-full bg-emerald-primary text-gold-accent shadow-soft">🍕 All</button>
                      <button className="text-xs px-3 py-1.5 rounded-full bg-sage/20 text-emerald-primary hover:bg-sage/30 transition-colors">👑 Owned</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {events.map((event, index) => (
                      <div key={event.id} className="animate-on-scroll" style={{animationDelay: `${index * 100}ms`}}>
                        <EventCard
                          event={event}
                          onClick={handleEventClick}
                          currentUserId={user.id}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Rooms Section with Filtering */}
              <section className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="roomeo-heading text-2xl">
                      {roomFilter === 'all' ? '🏠 All Rooms' : 
                       roomFilter === 'regular' ? '🏠 Regular Rooms' : '🎉 Event Rooms'}
                    </h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleFilterChange('all')}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                          roomFilter === 'all' 
                            ? 'bg-emerald-primary text-gold-accent shadow-soft' 
                            : 'bg-sage/20 text-emerald-primary hover:bg-sage/30'
                        }`}
                      >
                        🏠 All Rooms
                      </button>
                      <button 
                        onClick={() => handleFilterChange('regular')}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                          roomFilter === 'regular' 
                            ? 'bg-emerald-primary text-gold-accent shadow-soft' 
                            : 'bg-sage/20 text-emerald-primary hover:bg-sage/30'
                        }`}
                      >
                        💸 Regular Rooms
                      </button>
                      <button 
                        onClick={() => handleFilterChange('event')}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                          roomFilter === 'event' 
                            ? 'bg-emerald-primary text-gold-accent shadow-soft' 
                            : 'bg-sage/20 text-emerald-primary hover:bg-sage/30'
                        }`}
                      >
                        🎉 Event Rooms
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display filtered active rooms only */}
                {(() => {
                  const currentRooms = getFilteredRooms();
                  const roomType = roomFilter === 'all' ? 'active rooms' : 
                                   roomFilter === 'regular' ? 'active regular rooms' : 'active event rooms';
                  
                  if (currentRooms.length > 0) {
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {currentRooms.map((expense, index) => (
                          <div key={expense.group_id} className="animate-on-scroll" style={{animationDelay: `${index * 100}ms`}}>
                            <ExpenseCard
                              expense={expense}
                              onSettleUp={handleSettleUp}
                              currentUserId={user.id}
                              onMarkPaid={handleMarkPaid}
                              onViewDetails={handleViewDetails}
                              onDelete={handleDeleteRoom}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    // Check if there are any settled rooms to mention in empty state
                    const allFilteredRooms = roomFilter === 'regular' ? allRooms.filter(room => !room.event_id) :
                                             roomFilter === 'event' ? allRooms.filter(room => room.event_id) : allRooms;
                    const settledCount = allFilteredRooms.filter(room => room.is_settled).length;
                    
                    return (
                      <div className="roomeo-card text-center py-16 animate-slide-up">
                        <div className="text-6xl mb-4">
                          {roomFilter === 'event' ? '🎉' : roomFilter === 'regular' ? '💸' : '🏠'}
                        </div>
                        <h3 className="roomeo-heading text-xl mb-2">
                          No {roomType}
                        </h3>
                        <p className="roomeo-body text-emerald-primary/60 mb-4">
                          {roomFilter === 'event' 
                            ? 'Create an event first, then add rooms to it!'
                            : roomFilter === 'regular' 
                            ? 'Start splitting expenses with your friends!'
                            : 'No active rooms found. Create your first room or event!'
                          }
                        </p>
                        {settledCount > 0 && (
                          <p className="roomeo-body text-emerald-primary/60 mb-8">
                            💡 You have {settledCount} settled room{settledCount !== 1 ? 's' : ''} in your{' '}
                            <button 
                              onClick={() => setIsHistoryModalOpen(true)}
                              className="roomeo-interactive"
                            >
                              History
                            </button>
                          </p>
                        )}
                        {(roomFilter === 'all' || roomFilter === 'regular') && (
                          <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="roomeo-button-primary"
                          >
                            <span>🚀</span> Create Your First Room
                          </button>
                        )}
                      </div>
                    );
                  }
                })()}
              </section>

              {/* Pending Settlements */}
              {dashboardData.pending_settlements.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="roomeo-heading text-2xl">⏳ Pending Settlements</h2>
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

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        friends={friends.map(f => ({
          id: f.friendId,
          name: f.name,
          profilePicture: f.profilePicture || undefined
        }))}
        onCreateExpense={handleCreateEvent}
      />

      {selectedExpense && (
        <>
          <SettlementModal
            isOpen={isSettlementModalOpen}
            onClose={() => {
              setIsSettlementModalOpen(false)
              setSelectedExpense(null)
            }}
            expense={selectedExpense}
            onSubmitSettlement={handleSubmitSettlement}
          />
          
          <ExpenseDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false)
              setSelectedExpense(null)
            }}
            expense={selectedExpense}
            currentUserId={user.id}
            onMarkPaid={handleMarkPaid}
          />
        </>
      )}

      <SettlementHistory
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Room"
        message={`Are you sure you want to delete "${roomToDelete?.group_name}"? This action cannot be undone and will remove all associated data.`}
        isLoading={isDeleting}
      />

      {/* Event Modal */}
      {selectedEventId && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false)
            setSelectedEventId(null)
          }}
          user={user}
          eventId={selectedEventId}
        />
      )}
    </div>
  )
}
