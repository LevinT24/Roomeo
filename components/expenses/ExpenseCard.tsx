"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExpenseCardProps, ExpenseParticipantSummary } from "@/types/expenses"
import { Clock, CheckCircle, XCircle, UserPlus, Mail, MessageCircle, Users } from "lucide-react"
import { useState, useEffect } from "react"
import InviteModal from "@/components/InviteModal"

interface PendingInvite {
  id: string;
  invited_email?: string;
  invited_phone?: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function ExpenseCard({ expense, onSettleUp, currentUserId, onMarkPaid }: ExpenseCardProps) {
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const remainingAmount = expense.amount_owed - expense.amount_paid
  const isSettled = expense.is_settled || remainingAmount <= 0.01

  // Get current user's participant data
  const currentUserParticipant = expense.participants?.find(p => p.user_id === currentUserId)
  const pendingSettlement = expense.pending_settlement // This will come from the updated data structure
  
  // Check if current user is the creator
  // First check created_by_id if available, otherwise check if user is marked as creator in participants
  const isCreator = expense.created_by_id ? 
    expense.created_by_id === currentUserId : 
    expense.participants?.some(p => p.user_id === currentUserId && p.is_creator) || false

  // Fetch pending invites for this group
  const fetchPendingInvites = async () => {
    try {
      setLoadingInvites(true);
      const response = await fetch(`/api/groups/${expense.group_id}/invites`);
      const data = await response.json();
      
      if (data.success) {
        const pending = data.invites.filter((invite: PendingInvite) => 
          invite.status === 'pending' && new Date(invite.expires_at) > new Date()
        );
        setPendingInvites(pending);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (isCreator) {
      fetchPendingInvites();
    } else {
      setLoadingInvites(false);
    }
  }, [expense.group_id, isCreator]);

  const formatDisplayName = (invite: PendingInvite) => {
    if (invite.invited_email && invite.invited_phone) {
      return `${invite.invited_email} (${invite.invited_phone})`;
    }
    return invite.invited_email || invite.invited_phone || 'Unknown contact';
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day';
    if (diffDays > 1) return `${diffDays} days`;
    return 'Soon';
  };

  const getInviteIcon = (invite: PendingInvite) => {
    if (invite.invited_email) return <Mail className="w-3 h-3" />;
    if (invite.invited_phone) return <MessageCircle className="w-3 h-3" />;
    return null;
  };

  const getStatusColor = () => {
    if (isSettled) return "bg-emerald-100 text-emerald-700 border-emerald-200"
    if (pendingSettlement?.status === 'pending') return "bg-yellow-100 text-yellow-700 border-yellow-200"
    if (remainingAmount > 0) return "bg-orange-100 text-orange-700 border-orange-200"
    return "bg-gray-100 text-gray-700 border-gray-200"
  }

  const getStatusText = () => {
    if (isSettled) return "Settled"
    if (pendingSettlement?.status === 'pending') return "Payment Pending"
    if (remainingAmount > 0) return "Outstanding"
    return "Complete"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Determine what button/status to show for the current user
  const renderUserActionSection = () => {
    // If the expense is settled
    if (isSettled) {
      return (
        <div className="w-full text-center py-2 px-4 bg-emerald-50 border border-emerald-200 rounded-md">
          <span className="text-emerald-700 font-medium flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            All settled up!
          </span>
        </div>
      )
    }

    // If current user is the creator - show management view
    if (isCreator) {
      const pendingCount = expense.pending_settlements_count || 0
      return (
        <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700 font-medium text-center">
            You created this expense
          </p>
          {pendingCount > 0 && (
            <p className="text-xs text-blue-600 text-center mt-1">
              {pendingCount} payment{pendingCount > 1 ? 's' : ''} pending approval
            </p>
          )}
        </div>
      )
    }

    // For participants - check if they have a pending settlement
    if (pendingSettlement) {
      switch (pendingSettlement.status) {
        case 'pending':
          return (
            <div className="w-full">
              <div className="text-center py-3 px-4 bg-yellow-50 border border-yellow-200 rounded-md mb-2">
                <div className="flex items-center justify-center gap-2 text-yellow-700 font-medium">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Payment Pending Approval</span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  ${pendingSettlement.amount?.toFixed(2) || '0.00'} submitted via {pendingSettlement.payment_method || 'unknown'}
                </p>
                <p className="text-xs text-yellow-500 mt-1">
                  {formatDate(pendingSettlement.created_at)}
                </p>
              </div>
              
              {/* Allow user to submit another payment if the pending one doesn't cover full amount */}
              {pendingSettlement.amount && pendingSettlement.amount < remainingAmount && (
                <Button 
                  onClick={() => onSettleUp(expense.group_id)}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Pay Remaining ${(remainingAmount - pendingSettlement.amount).toFixed(2)}
                </Button>
              )}
            </div>
          )
          
        case 'approved':
          // This shouldn't happen as approved payments update amount_paid
          return (
            <div className="w-full text-center py-2 px-4 bg-emerald-50 border border-emerald-200 rounded-md">
              <span className="text-emerald-700 font-medium flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Payment Approved
              </span>
            </div>
          )
          
        case 'rejected':
          return (
            <div className="w-full">
              <div className="text-center py-2 px-4 bg-red-50 border border-red-200 rounded-md mb-2">
                <span className="text-red-700 font-medium flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Payment Rejected
                </span>
                <p className="text-xs text-red-600 mt-1">
                  Please submit a new payment
                </p>
              </div>
              <Button 
                onClick={() => onSettleUp(expense.group_id)}
                className="w-full bg-[#F05224] hover:bg-[#D63E1A] text-white font-semibold py-2 px-4 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000]"
              >
                Settle Up ${remainingAmount.toFixed(2)}
              </Button>
            </div>
          )
          
        default:
          break
      }
    }

    // Default: Show settle up button if there's remaining amount
    if (remainingAmount > 0 && expense.amount_owed > 0) {
      return (
        <Button 
          onClick={() => onSettleUp(expense.group_id)}
          className="w-full bg-[#F05224] hover:bg-[#D63E1A] text-white font-semibold py-2 px-4 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000]"
        >
          Settle Up ${remainingAmount.toFixed(2)}
        </Button>
      )
    }

    return null
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center justify-center rounded-md bg-[#F05224] shrink-0 w-10 h-10 sm:w-12 sm:h-12 text-white">
            <svg fill="currentColor" height="20px" viewBox="0 0 256 256" width="20px" className="sm:w-6 sm:h-6">
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">{expense.group_name}</h3>
            {expense.group_description && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{expense.group_description}</p>
            )}
            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
              Created by {expense.created_by_name} • {formatDate(expense.created_at)}
            </p>
          </div>
        </div>
        
        <Badge className={`${getStatusColor()} font-medium px-2 sm:px-3 py-1 text-xs sm:text-sm shrink-0`}>
          {getStatusText()}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-600">Total Amount</p>
          <p className="text-base sm:text-lg font-bold text-gray-900">${expense.total_amount.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-600">Your Share</p>
          <p className="text-base sm:text-lg font-bold text-gray-900">${expense.amount_owed.toFixed(2)}</p>
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
          {!isSettled && pendingSettlement?.status === 'pending' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Pending:</span>
              <span className="text-sm font-semibold text-yellow-600">
                ${pendingSettlement.amount.toFixed(2)}
              </span>
            </div>
          )}
          {!isSettled && remainingAmount > 0 && !pendingSettlement && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Remaining:</span>
              <span className="text-sm font-semibold text-orange-600">
                ${remainingAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-3 sm:mx-4">
          <div className="w-full bg-gray-200 rounded-full h-2 relative">
            {/* Paid amount (green) */}
            <div 
              className="bg-emerald-500 h-2 rounded-full absolute left-0 top-0 transition-all duration-300"
              style={{ 
                width: `${expense.amount_owed > 0 ? Math.min((expense.amount_paid / expense.amount_owed) * 100, 100) : 0}%` 
              }}
            ></div>
            
            {/* Pending amount (yellow) - stacked on top of paid */}
            {pendingSettlement?.status === 'pending' && pendingSettlement.amount && (
              <div 
                className="bg-yellow-400 h-2 rounded-full absolute top-0 transition-all duration-300"
                style={{ 
                  left: `${expense.amount_owed > 0 ? Math.min((expense.amount_paid / expense.amount_owed) * 100, 100) : 0}%`,
                  width: `${expense.amount_owed > 0 ? Math.min((pendingSettlement.amount / expense.amount_owed) * 100, 100 - ((expense.amount_paid / expense.amount_owed) * 100)) : 0}%` 
                }}
              ></div>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              {expense.amount_owed > 0 ? ((expense.amount_paid / expense.amount_owed) * 100).toFixed(0) : '0'}% paid
            </span>
            {pendingSettlement?.status === 'pending' && pendingSettlement.amount && (
              <span className="text-yellow-600">
                +{expense.amount_owed > 0 ? ((pendingSettlement.amount / expense.amount_owed) * 100).toFixed(0) : '0'}% pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User Action Section */}
      {renderUserActionSection()}

      {/* Participants Section */}
      {expense.participants && expense.participants.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-700">Participants</h4>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                {expense.participants.length}
                {!loadingInvites && pendingInvites.length > 0 && (
                  <span className="text-amber-600"> + {pendingInvites.length} invited</span>
                )}
              </span>
            </div>
            {isCreator && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
                title="Invite more people"
              >
                <UserPlus className="w-3 h-3" />
                Invite
              </button>
            )}
          </div>
          <div className="space-y-2">
            {expense.participants.map((participant) => {
              const participantPending = participant.pending_settlement
              
              return (
                <div key={participant.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 sm:p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-full bg-gray-200 bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: participant.profile_picture
                          ? `url("${participant.profile_picture}")`
                          : 'url("/placeholder.svg?height=32&width=32")'
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-sm font-medium truncate">
                          {participant.name}
                          {participant.is_creator && <span className="text-xs text-blue-600 ml-1">(Creator)</span>}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:gap-1">
                        <span>Owes: ${participant.amount_owed.toFixed(2)}</span>
                        <span className="hidden sm:inline">|</span>
                        <span>Paid: ${participant.amount_paid.toFixed(2)}</span>
                        {participantPending && participantPending.amount && (
                          <>
                            <span className="hidden sm:inline">|</span>
                            <span className="text-yellow-600">Pending: ${participantPending.amount.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Status & Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2">
                    {participant.is_settled ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                        ✓ Settled
                      </span>
                    ) : participantPending?.status === 'pending' ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        ⏳ Pending
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full whitespace-nowrap">
                          ${(participant.amount_owed - participant.amount_paid).toFixed(2)} left
                        </span>
                        
                        {/* Creator can mark others as paid */}
                        {isCreator && participant.user_id !== currentUserId && onMarkPaid && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => onMarkPaid(expense.group_id, participant.user_id, true)}
                              className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600 min-w-[24px] h-[24px] flex items-center justify-center"
                              title="Mark as paid"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => onMarkPaid(expense.group_id, participant.user_id, false)}
                              className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500 min-w-[24px] h-[24px] flex items-center justify-center"
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
              )
            })}

            {/* Pending Invites */}
            {!loadingInvites && pendingInvites.length > 0 && (
              <>
                <div className="border-t border-gray-200 my-3"></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      Waiting for {pendingInvites.length} invited user{pendingInvites.length > 1 ? 's' : ''} to join
                    </span>
                  </div>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber-900">
                              {formatDisplayName(invite)}
                            </span>
                            {getInviteIcon(invite)}
                          </div>
                          <div className="text-xs text-amber-700">
                            Expires in {getTimeRemaining(invite.expires_at)} • 
                            Invited {new Date(invite.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                        ⏳ Pending
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            fetchPendingInvites(); // Refresh invites after modal closes
          }}
          groupId={expense.group_id}
          groupName={(expense as any).name}
        />
      )}
    </div>
  )
}