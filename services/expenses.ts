// services/expenses.ts - Updated getExpenseDashboardData function
import { supabase } from "@/lib/supabase";
import {
  CreateExpenseGroupRequest,
  CreateExpenseGroupResponse,
  SubmitSettlementRequest,
  SubmitSettlementResponse,
  ApproveSettlementRequest,
  ApproveSettlementResponse,
  ExpenseSummary,
  ExpenseDashboardData,
  PendingSettlement,
  ExpenseGroup,
  ExpenseParticipant,
  Settlement,
  UserPendingSettlement,
  UserExpenseSummary,
  SettlementChangePayload,
} from "@/types/expenses";

// Helper function to ensure user is authenticated
async function ensureAuthenticated() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function createExpenseGroup(
  data: CreateExpenseGroupRequest
): Promise<CreateExpenseGroupResponse> {
  try {
    console.log("🔄 Creating expense group:", data);

    // Ensure user is authenticated
    await ensureAuthenticated();

    // Validate inputs
    if (!data.name.trim()) {
      throw new Error("Expense name is required");
    }
    if (data.total_amount <= 0) {
      throw new Error("Total amount must be greater than 0");
    }
    if (data.participants.length < 1 && !data.invites) {
      throw new Error("At least 1 participant or invite is required");
    }

    // Validate custom amounts if provided
    if (data.split_type === 'custom') {
      if (!data.custom_amounts || data.custom_amounts.length !== data.participants.length) {
        throw new Error("Custom amounts must be provided for all participants");
      }
      const totalCustom = data.custom_amounts.reduce((sum, amount) => sum + amount, 0);
      if (totalCustom > data.total_amount) {
        throw new Error("Custom amounts cannot exceed the total amount");
      }
    }

    // Call database function to create expense group
    const { data: result, error } = await supabase.rpc('create_expense_group', {
      p_name: data.name,
      p_total_amount: data.total_amount,
      p_participants: data.participants,
      p_description: data.description || null,
      p_split_type: data.split_type,
      p_custom_amounts: data.custom_amounts || null,
      p_create_group_chat: false
    });

    if (error) {
      console.error("❌ Error creating expense group:", error);
      throw new Error(error.message || "Failed to create expense group");
    }

    console.log("✅ Expense group created with ID:", result);

    // Send invites if provided
    if (data.invites && data.invites.length > 0) {
      console.log("📧 Sending invites for group:", result);
      
      for (const invite of data.invites) {
        try {
          const invitePayload = {
            groupId: result,
            inviteMethod: invite.method,
            [invite.method === 'email' ? 'recipientEmail' : 'recipientPhone']: invite.contact,
            ...(invite.message ? { customMessage: invite.message } : {})
          };

          const response = await fetch('/api/invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invitePayload),
          });

          if (!response.ok) {
            console.error(`Failed to send invite to ${invite.contact}:`, await response.text());
          } else {
            console.log(`✅ Invite sent to ${invite.contact}`);
          }
        } catch (inviteError) {
          console.error(`Error sending invite to ${invite.contact}:`, inviteError);
        }
      }
    }

    // Send notifications to all participants
    await sendExpenseNotifications(result, data.participants, 'expense_created', {
      expense_group_id: result,
      expense_name: data.name
    });

    return {
      group_id: result,
      success: true
    };
  } catch (error) {
    console.error("❌ Exception creating expense group:", error);
    return {
      group_id: '',
      success: false,
      message: error instanceof Error ? error.message : "Failed to create expense group"
    };
  }
}

export async function submitSettlement(
  data: SubmitSettlementRequest
): Promise<SubmitSettlementResponse> {
  try {
    console.log("🔄 Submitting settlement:", data);

    // Ensure user is authenticated
    const user = await ensureAuthenticated();

    // Validate inputs
    if (!data.group_id) {
      throw new Error("Group ID is required");
    }
    if (data.amount <= 0) {
      throw new Error("Settlement amount must be greater than 0");
    }
    if (!data.payment_method) {
      throw new Error("Payment method is required");
    }

    // Call database function to submit settlement
    console.log("🔄 Calling submit_settlement function with params:", {
      p_group_id: data.group_id,
      p_amount: data.amount,
      p_payment_method: data.payment_method,
      p_proof_image: data.proof_image || null,
      p_notes: data.notes || null
    });

    const { data: result, error } = await supabase.rpc('submit_settlement', {
      p_group_id: data.group_id,
      p_amount: data.amount,
      p_payment_method: data.payment_method,
      p_proof_image: data.proof_image || null,
      p_notes: data.notes || null
    });

    console.log("📋 Database function response - data:", result, "error:", error);

    if (error) {
      console.error("❌ Error submitting settlement:", error);
      
      // Provide more specific error messages
      if (error.message?.includes('not a participant')) {
        throw new Error("You are not a participant in this expense group");
      }
      if (error.message?.includes('yourself')) {
        throw new Error("You cannot submit a settlement to yourself");
      }
      if (error.message?.includes('No outstanding')) {
        throw new Error("No outstanding amount to settle");
      }
      if (error.message?.includes('exceed')) {
        throw new Error("Settlement amount cannot exceed amount owed");
      }
      
      throw new Error(error.message || "Failed to submit settlement");
    }

    if (!result) {
      console.error("❌ No settlement ID returned from database function");
      throw new Error("Settlement submission failed - no ID returned");
    }

    console.log("✅ Settlement submitted with ID:", result);

    // Attempt to get expense group details for notification (but don't fail if this doesn't work)
    try {
      const { data: expenseGroup } = await supabase
        .from('expense_groups')
        .select('name, created_by')
        .eq('id', data.group_id)
        .single();

      // Send notification to group creator
      if (expenseGroup && expenseGroup.created_by) {
        // Get payer name for notification
        const { data: payerData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        await sendExpenseNotifications(result, [expenseGroup.created_by], 'settlement_requested', {
          expense_group_id: data.group_id,
          expense_name: expenseGroup.name,
          amount: data.amount,
          settlement_id: result,
          payer_name: payerData?.name || 'Someone'
        });
      }
    } catch (notificationError) {
      console.warn("⚠️ Failed to send notification:", notificationError);
      // Don't fail the whole operation if notification fails
    }

    return {
      settlement_id: result,
      success: true
    };
  } catch (error) {
    console.error("❌ Exception submitting settlement:", error);
    return {
      settlement_id: '',
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit settlement"
    };
  }
}

export async function approveSettlement(
  data: ApproveSettlementRequest
): Promise<ApproveSettlementResponse> {
  try {
    console.log("🔄 Approving settlement:", data);

    // Ensure user is authenticated
    await ensureAuthenticated();

    // Call database function to approve/reject settlement
    const { data: result, error } = await supabase.rpc('approve_settlement', {
      p_settlement_id: data.settlement_id,
      p_approved: data.approved
    });

    if (error) {
      console.error("❌ Error processing settlement approval:", error);
      throw new Error(error.message || "Failed to process settlement");
    }

    console.log(`✅ Settlement ${data.approved ? 'approved' : 'rejected'}`);

    // Get settlement details for notification
    const { data: settlement } = await supabase
      .from('settlements')
      .select(`
        payer_id,
        amount,
        expense_groups!group_id(name),
        users!payer_id(name)
      `)
      .eq('id', data.settlement_id)
      .single();

    // Send notification to payer
    if (settlement) {
      await sendExpenseNotifications(
        data.settlement_id,
        [settlement.payer_id],
        data.approved ? 'settlement_approved' : 'settlement_rejected',
        {
          expense_group_id: '',
          expense_name: (settlement as any).expense_groups?.name || 'Unknown Group',
          amount: settlement.amount,
          settlement_id: data.settlement_id,
          payer_name: (settlement as any).users?.name || 'Someone'
        }
      );
    }

    return {
      success: true,
      approved: data.approved
    };
  } catch (error) {
    console.error("❌ Exception processing settlement approval:", error);
    return {
      success: false,
      approved: false,
      message: error instanceof Error ? error.message : "Failed to process settlement"
    };
  }
}

export async function getExpenseSummary(userId?: string): Promise<ExpenseSummary[]> {
  try {
    console.log("🔄 Fetching expense summary for user:", userId || "current user");

    // Ensure user is authenticated  
    const user = await ensureAuthenticated();

    // Use the original function that has the correct structure with participants
    const { data, error } = await supabase.rpc('get_expense_summary', {
      p_user_id: userId || user.id
    });

    if (error) {
      console.error("❌ Error fetching expense summary:", error);
      throw new Error(error.message || "Failed to fetch expense summary");
    }

    console.log("✅ Expense summary retrieved:", data?.length || 0, "groups");
    return data || [];
  } catch (error) {
    console.error("❌ Exception fetching expense summary:", error);
    return [];
  }
}

export async function getPendingSettlements(userId?: string): Promise<PendingSettlement[]> {
  try {
    console.log("🔄 Fetching pending settlements for user:", userId || "current user");

    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;

    // Use SECURITY DEFINER function to bypass RLS issues
    const { data, error } = await supabase.rpc('get_user_pending_settlements', {
      p_user_id: targetUserId
    });

    if (error) {
      console.error("❌ Error fetching pending settlements:", error);
      throw new Error(error.message || "Failed to fetch pending settlements");
    }

    // Map the function result to PendingSettlement format
    const pendingSettlements: PendingSettlement[] = (data || []).map((settlement: UserPendingSettlement) => ({
      settlement_id: settlement.settlement_id,
      group_name: settlement.group_name || `Group ${settlement.group_id.toString().slice(0, 8)}...`,
      payer_name: settlement.payer_name || `User ${settlement.payer_id.toString().slice(0, 8)}...`,
      receiver_id: settlement.receiver_id,
      amount: settlement.amount,
      payment_method: settlement.payment_method,
      status: settlement.status,
      created_at: settlement.created_at,
      proof_image: settlement.proof_image,
      notes: settlement.notes
    }));

    console.log("✅ Pending settlements retrieved:", pendingSettlements.length);
    return pendingSettlements;

  } catch (error) {
    console.error("❌ Exception fetching pending settlements:", error);
    return [];
  }
}

export async function getExpenseDashboardData(userId?: string): Promise<ExpenseDashboardData> {
  try {
    console.log("🔄 Fetching enhanced expense dashboard data");

    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;

    // Use the enhanced database function
    const { data, error } = await supabase.rpc('get_expense_dashboard_data', {
      p_user_id: targetUserId
    });

    if (error) {
      console.error("❌ Error fetching dashboard data:", error);
      
      // Fallback to the original method if the enhanced function doesn't exist
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.log("📋 Enhanced function not available, using fallback method");
        
        const [expenseSummary, pendingSettlements] = await Promise.all([
          getExpenseSummaryWithPendingStatus(targetUserId),
          getPendingSettlements(targetUserId)
        ]);

        const total_owed = expenseSummary.reduce((sum, expense) => 
          sum + (expense.amount_owed - expense.amount_paid), 0
        );

        const total_to_receive = pendingSettlements.reduce((sum, settlement) => 
          sum + settlement.amount, 0
        );

        return {
          active_expenses: expenseSummary,
          pending_settlements: pendingSettlements,
          total_owed,
          total_to_receive
        };
      }
      
      throw new Error(error.message || "Failed to fetch dashboard data");
    }

    // Parse the JSONB response
    const dashboardData: ExpenseDashboardData = {
      active_expenses: data.active_expenses || [],
      pending_settlements: data.pending_settlements || [],
      total_owed: parseFloat(data.total_owed || 0),
      total_to_receive: parseFloat(data.total_to_receive || 0)
    };

    console.log("✅ Enhanced dashboard data compiled:", {
      active_expenses: dashboardData.active_expenses.length,
      pending_settlements: dashboardData.pending_settlements.length,
      total_owed: dashboardData.total_owed,
      total_to_receive: dashboardData.total_to_receive
    });

    return dashboardData;
  } catch (error) {
    console.error("❌ Exception fetching dashboard data:", error);
    return {
      active_expenses: [],
      pending_settlements: [],
      total_owed: 0,
      total_to_receive: 0
    };
  }
}

// Enhanced function to get expense summary with pending settlement status
async function getExpenseSummaryWithPendingStatus(userId: string): Promise<ExpenseSummary[]> {
  try {
    console.log("🔄 Fetching expense summary with pending status");

    // Get basic expense summary
    const { data: expenses, error: expenseError } = await supabase
      .from('expense_groups')
      .select(`
        id,
        name,
        description,
        total_amount,
        created_by,
        created_at,
        status,
        expense_participants!inner(
          amount_owed,
          amount_paid,
          is_settled
        ),
        users!expense_groups_created_by_fkey(
          name
        )
      `)
      .eq('expense_participants.user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (expenseError) {
      console.error("Error fetching expenses:", expenseError);
      throw expenseError;
    }

    // Get pending settlements for each expense
    const expensesWithPending = await Promise.all(
      (expenses || []).map(async (expense) => {
        // Get current user's pending settlement for this expense
        const { data: pendingSettlement } = await supabase
          .from('settlements')
          .select('id, amount, payment_method, status, created_at')
          .eq('group_id', expense.id)
          .eq('payer_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get all participants with their statuses
        const { data: participants } = await supabase
          .from('expense_participants')
          .select(`
            user_id,
            amount_owed,
            amount_paid,
            is_settled,
            users!inner(
              name,
              profilePicture
            )
          `)
          .eq('group_id', expense.id);

        // Get pending settlements for all participants
        const participantsWithPending = await Promise.all(
          (participants || []).map(async (participant) => {
            const { data: participantPending } = await supabase
              .from('settlements')
              .select('id, amount, payment_method, status, created_at')
              .eq('group_id', expense.id)
              .eq('payer_id', participant.user_id)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              user_id: participant.user_id,
              name: (participant as any).users.name,
              profile_picture: (participant as any).users.profilePicture,
              amount_owed: participant.amount_owed,
              amount_paid: participant.amount_paid,
              is_settled: participant.is_settled,
              is_creator: participant.user_id === expense.created_by,
              pending_settlement: participantPending ? {
                settlement_id: participantPending.id,
                amount: participantPending.amount,
                payment_method: participantPending.payment_method,
                status: participantPending.status,
                created_at: participantPending.created_at
              } : undefined
            };
          })
        );

        // Count all pending settlements for this expense
        const { count: pendingCount } = await supabase
          .from('settlements')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', expense.id)
          .eq('status', 'pending');

        const expenseSummary: ExpenseSummary = {
          group_id: expense.id,
          group_name: expense.name,
          group_description: expense.description,
          total_amount: expense.total_amount,
          amount_owed: expense.expense_participants[0].amount_owed,
          amount_paid: expense.expense_participants[0].amount_paid,
          is_settled: expense.expense_participants[0].is_settled,
          created_by_name: (expense as any).users.name,
          created_by_id: expense.created_by,
          created_at: expense.created_at,
          group_status: expense.status,
          participants: participantsWithPending,
          pending_settlement: pendingSettlement ? {
            settlement_id: pendingSettlement.id,
            amount: pendingSettlement.amount,
            payment_method: pendingSettlement.payment_method,
            status: pendingSettlement.status,
            created_at: pendingSettlement.created_at
          } : undefined,
          pending_settlements_count: pendingCount || 0
        };

        return expenseSummary;
      })
    );

    console.log("✅ Enhanced expense summary retrieved:", expensesWithPending.length, "groups");
    return expensesWithPending;
  } catch (error) {
    console.error("❌ Exception fetching expense summary with pending status:", error);
    return [];
  }
}

// Helper function to send notifications
async function sendExpenseNotifications(
  entityId: string,
  userIds: string[],
  type: 'expense_created' | 'settlement_requested' | 'settlement_approved' | 'settlement_rejected' | 'expense_settled',
  data: any
): Promise<void> {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'expense',
      title: getNotificationTitle(type),
      message: getNotificationMessage(type, data),
      data: {
        ...data,
        notification_type: type
      }
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error("❌ Error sending notifications:", error);
    } else {
      console.log("✅ Notifications sent to", userIds.length, "users");
    }
  } catch (error) {
    console.error("❌ Exception sending notifications:", error);
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'expense_created':
      return 'New Expense Room';
    case 'settlement_requested':
      return 'Payment Submitted';
    case 'settlement_approved':
      return 'Payment Approved';
    case 'settlement_rejected':
      return 'Payment Rejected';
    case 'expense_settled':
      return 'Expense Settled';
    default:
      return 'Expense Update';
  }
}

function getNotificationMessage(type: string, data: any): string {
  switch (type) {
    case 'expense_created':
      return `You've been added to "${data.expense_name}" expense room`;
    case 'settlement_requested':
      return `${data.payer_name || 'Someone'} submitted a $${data.amount} payment for "${data.expense_name}"`;
    case 'settlement_approved':
      return `Your $${data.amount} payment for "${data.expense_name}" was approved`;
    case 'settlement_rejected':
      return `Your $${data.amount} payment for "${data.expense_name}" was rejected`;
    case 'expense_settled':
      return `"${data.expense_name}" has been fully settled`;
    default:
      return 'You have an expense update';
  }
}

// Real-time subscription helpers
export function subscribeToExpenseUpdates(
  userId: string,
  onUpdate: (payload: any) => void
) {
  console.log("🔄 Setting up expense real-time subscriptions");

  // Subscribe to settlements changes (both as payer and receiver)
  const settlementsSubscription = supabase
    .channel('settlements')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'settlements'
      },
      (payload: any) => {
        // Only trigger update if this user is involved in the settlement
        const settlement = payload.new || payload.old;
        if (settlement?.payer_id === userId || settlement?.receiver_id === userId) {
          onUpdate(payload);
        }
      }
    )
    .subscribe();

  // Subscribe to expense participants changes
  const participantsSubscription = supabase
    .channel('expense_participants')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expense_participants',
        filter: `user_id=eq.${userId}`
      },
      onUpdate
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(participantsSubscription);
      supabase.removeChannel(settlementsSubscription);
    }
  };
}

// Helper function to refresh dashboard data after settlement actions
export async function refreshDashboardAfterSettlement(userId?: string): Promise<ExpenseDashboardData> {
  console.log("🔄 Refreshing dashboard data after settlement action");
  return await getExpenseDashboardData(userId);
}

// Debug function to check settlement creation
export async function debugSettlementCreation(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('test_settlement_creation');
    
    if (error) {
      console.error("❌ Error running debug function:", error);
    } else {
      console.log("🔍 Debug info:", data);
    }
  } catch (error) {
    console.error("❌ Exception in debug function:", error);
  }
}

export async function markParticipantPayment(
  groupId: string,
  userId: string,
  markAsPaid: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log(`🔄 Marking participant payment: ${markAsPaid ? 'paid' : 'unpaid'}`, { groupId, userId });

    // Ensure user is authenticated
    await ensureAuthenticated();

    // Call database function to mark payment
    const { data: result, error } = await supabase.rpc('mark_participant_payment', {
      p_group_id: groupId,
      p_user_id: userId,
      p_mark_as_paid: markAsPaid
    });

    if (error) {
      console.error("❌ Error marking participant payment:", error);
      throw new Error(error.message || "Failed to mark participant payment");
    }

    console.log(`✅ Participant marked as ${markAsPaid ? 'paid' : 'unpaid'}`);

    return {
      success: true
    };
  } catch (error) {
    console.error("❌ Exception marking participant payment:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to mark participant payment"
    };
  }
}

// Settlement History and Analytics
export async function getSettlementHistory(userId?: string): Promise<{
  history: any[],
  analytics: any
}> {
  try {
    console.log("🔄 Fetching settlement history and analytics");

    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;

    // Try simpler query first to avoid naming issues
    const { data: historyData, error: historyError } = await supabase
      .from('settlements')
      .select('*')
      .or(`payer_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
      .order('created_at', { ascending: false });
      
    let enhancedHistoryData = historyData;
    
    // If basic query works, try to enhance with names
    if (!historyError && historyData) {
      const { data: dataWithJoins, error: joinError } = await supabase
        .from('settlements')
        .select(`
          *,
          expense_groups(name),
          payer:users!payer_id(name),
          receiver:users!receiver_id(name)
        `)
        .or(`payer_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false });
        
      if (!joinError && dataWithJoins) {
        enhancedHistoryData = dataWithJoins;
      }
    }

    if (historyError) {
      console.error("❌ Error fetching settlement history:", historyError);
      throw new Error(historyError.message || 'Failed to fetch settlement history');
    }

    // Transform data with names when available
    const history = (enhancedHistoryData || []).map(settlement => ({
      id: settlement.id,
      group_name: settlement.expense_groups?.[0]?.name || `Group ${settlement.group_id.slice(0, 8)}...`,
      amount: settlement.amount,
      payment_method: settlement.payment_method,
      status: settlement.status,
      created_at: settlement.created_at,
      approved_at: settlement.approved_at,
      type: settlement.payer_id === targetUserId ? 'sent' : 'received',
      payer_name: settlement.payer?.name || `User ${settlement.payer_id.slice(0, 8)}...`,
      receiver_name: settlement.receiver?.name || `User ${settlement.receiver_id.slice(0, 8)}...`
    }));

    // Calculate analytics
    const approvedSettlements = history.filter(h => h.status === 'approved');
    const totalPaid = approvedSettlements.filter(h => h.type === 'sent').reduce((sum, h) => sum + h.amount, 0);
    const totalReceived = approvedSettlements.filter(h => h.type === 'received').reduce((sum, h) => sum + h.amount, 0);
    const totalTransactions = approvedSettlements.length;
    const averageAmount = totalTransactions > 0 ? (totalPaid + totalReceived) / totalTransactions : 0;

    // Calculate most used payment method
    const methodCounts = approvedSettlements.reduce((acc, h) => {
      acc[h.payment_method] = (acc[h.payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsedMethod = Object.entries(methodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'cash';

    const analytics = {
      total_paid: totalPaid,
      total_received: totalReceived,
      total_transactions: totalTransactions,
      average_amount: averageAmount,
      most_used_method: mostUsedMethod,
      monthly_summary: [] // Could be enhanced later
    };

    console.log("✅ Settlement history retrieved:", history.length, "items");
    return { history, analytics };

  } catch (error) {
    console.error("❌ Exception fetching settlement history:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch settlement history");
  }
}

// Export Expense Reports
export async function exportExpenseReport(
  format: 'pdf' | 'csv' | 'excel',
  statusFilter: 'all' | 'approved' | 'pending' | 'rejected' = 'all',
  typeFilter: 'all' | 'sent' | 'received' = 'all'
): Promise<void> {
  try {
    console.log(`🔄 Exporting expense report as ${format}`);

    // Ensure user is authenticated
    const user = await ensureAuthenticated();

    // Get settlement history for export
    const { history } = await getSettlementHistory();

    // Filter data based on filters
    let filteredData = history;
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => item.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      filteredData = filteredData.filter(item => item.type === typeFilter);
    }

    if (format === 'csv') {
      // Export as CSV
      const csvContent = generateCSV(filteredData);
      downloadFile(csvContent, `expense_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else if (format === 'pdf') {
      // For PDF, we could use a library like jsPDF or send to a backend service
      // For now, let's export as CSV as a fallback
      console.log("📋 PDF export not implemented yet, falling back to CSV");
      const csvContent = generateCSV(filteredData);
      downloadFile(csvContent, `expense_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else {
      // Excel export would require a library like SheetJS
      console.log("📋 Excel export not implemented yet, falling back to CSV");
      const csvContent = generateCSV(filteredData);
      downloadFile(csvContent, `expense_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }

    console.log("✅ Report exported successfully");

  } catch (error) {
    console.error("❌ Exception exporting report:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to export report");
  }
}

// Helper function to generate CSV content
function generateCSV(data: any[]): string {
  if (data.length === 0) return 'No data to export';

  const headers = ['Date', 'Group', 'Type', 'Amount', 'Payment Method', 'Status', 'Notes'];
  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      new Date(item.created_at).toLocaleDateString(),
      `"${item.group_name}"`,
      item.type,
      item.amount,
      item.payment_method,
      item.status,
      `"${item.notes || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

// Helper function to download file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}