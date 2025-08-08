// services/expenses.ts - Client-side expense operations
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
    if (data.participants.length < 1) {
      throw new Error("At least 1 participant is required");
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
    await ensureAuthenticated();

    // Validate inputs
    if (data.amount <= 0) {
      throw new Error("Settlement amount must be greater than 0");
    }

    // Get current user for authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Skip client-side validation due to RLS circular dependency issues
    // The database function will handle all validation including:
    // - User is a participant in the group
    // - User is not the creator trying to pay themselves
    // - Group exists and is valid
    console.log("📋 Bypassing client-side validation due to RLS policies, letting database function handle validation");

    // Test if the function exists and user is authenticated
    console.log("🧪 Testing database connection and auth...");
    const { data: testData, error: testError } = await supabase.rpc('get_expense_summary', {
      p_user_id: user.id
    });
    console.log("🧪 Test function response:", { data: testData, error: testError });

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
      throw new Error(error.message || "Failed to submit settlement");
    }

    if (!result) {
      console.error("❌ No settlement ID returned from database function");
      throw new Error("Settlement submission failed - no ID returned");
    }

    console.log("✅ Settlement submitted with ID:", result);

    // Get expense group details for notification
    const { data: expenseGroup } = await supabase
      .from('expense_groups')
      .select('name, created_by')
      .eq('id', data.group_id)
      .single();

    // Send notification to group creator
    if (expenseGroup) {
      await sendExpenseNotifications(result, [expenseGroup.created_by], 'settlement_requested', {
        expense_group_id: data.group_id,
        expense_name: expenseGroup.name,
        amount: data.amount,
        settlement_id: result
      });
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
        expense_groups!inner(name)
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
          expense_name: settlement.expense_groups.name,
          amount: settlement.amount,
          settlement_id: data.settlement_id
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

    // Ensure user is authenticated
    const user = await ensureAuthenticated();

    // Use database function to bypass RLS issues
    const { data, error } = await supabase.rpc('get_pending_settlements', {
      user_id_param: userId || user.id
    });

    if (error) {
      console.error("❌ Error fetching pending settlements:", error);
      // If the function doesn't exist, fall back to a simpler query
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.log("📋 Database function not available, using simplified query");
        
        const { data: simpleData, error: simpleError } = await supabase
          .from('settlements')
          .select('id, amount, payment_method, status, created_at, proof_image, notes, group_id, payer_id')
          .eq('status', 'pending')
          .eq('receiver_id', userId || user.id)
          .order('created_at', { ascending: false });

        if (simpleError) {
          console.error("❌ Error with simplified query:", simpleError);
          throw new Error(simpleError.message || "Failed to fetch pending settlements");
        }

        // Map simple data without group/user names (we'll show IDs for now)
        const pendingSettlements: PendingSettlement[] = (simpleData || []).map(settlement => ({
          settlement_id: settlement.id,
          group_name: `Group ${settlement.group_id.slice(0, 8)}...`,
          payer_name: `User ${settlement.payer_id.slice(0, 8)}...`,
          amount: settlement.amount,
          payment_method: settlement.payment_method,
          status: settlement.status,
          created_at: settlement.created_at,
          proof_image: settlement.proof_image,
          notes: settlement.notes
        }));

        return pendingSettlements;
      }
      throw new Error(error.message || "Failed to fetch pending settlements");
    }

    // If using the database function, data should already be properly formatted
    const pendingSettlements: PendingSettlement[] = data || [];

    console.log("✅ Pending settlements retrieved:", pendingSettlements.length);
    return pendingSettlements;
  } catch (error) {
    console.error("❌ Exception fetching pending settlements:", error);
    return [];
  }
}

export async function getExpenseDashboardData(userId?: string): Promise<ExpenseDashboardData> {
  try {
    console.log("🔄 Fetching expense dashboard data");

    // Ensure user is authenticated
    await ensureAuthenticated();

    const [expenseSummary, pendingSettlements] = await Promise.all([
      getExpenseSummary(userId),
      getPendingSettlements(userId)
    ]);

    // Calculate totals
    const total_owed = expenseSummary.reduce((sum, expense) => 
      sum + (expense.amount_owed - expense.amount_paid), 0
    );

    const total_to_receive = pendingSettlements.reduce((sum, settlement) => 
      sum + settlement.amount, 0
    );

    const dashboardData: ExpenseDashboardData = {
      active_expenses: expenseSummary,
      pending_settlements: pendingSettlements,
      total_owed,
      total_to_receive
    };

    console.log("✅ Dashboard data compiled:", {
      active_expenses: expenseSummary.length,
      pending_settlements: pendingSettlements.length,
      total_owed,
      total_to_receive
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
      return `Someone submitted a $${data.amount} payment for "${data.expense_name}"`;
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

  // Subscribe to settlements changes
  const settlementsSubscription = supabase
    .channel('settlements')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'settlements',
        filter: `payer_id=eq.${userId}`
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

    // Ensure user is authenticated
    const user = await ensureAuthenticated();

    // Use database function to get comprehensive history and analytics
    const { data, error } = await supabase.rpc('get_settlement_history_analytics', {
      p_user_id: userId || user.id
    });

    if (error) {
      console.error("❌ Error fetching settlement history:", error);
      // Fallback to simple queries if function doesn't exist
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.log("📋 Database function not available, using fallback queries");
        
        // Get basic settlement history
        const { data: historyData, error: historyError } = await supabase
          .from('settlements')
          .select(`
            id,
            amount,
            payment_method,
            status,
            created_at,
            approved_at,
            group_id,
            payer_id,
            receiver_id
          `)
          .or(`payer_id.eq.${userId || user.id},receiver_id.eq.${userId || user.id}`)
          .order('created_at', { ascending: false });

        if (historyError) {
          throw new Error(historyError.message || 'Failed to fetch settlement history');
        }

        // Transform and create basic analytics
        const history = (historyData || []).map(settlement => ({
          id: settlement.id,
          group_name: `Group ${settlement.group_id.slice(0, 8)}...`,
          amount: settlement.amount,
          payment_method: settlement.payment_method,
          status: settlement.status,
          created_at: settlement.created_at,
          approved_at: settlement.approved_at,
          type: settlement.payer_id === (userId || user.id) ? 'sent' : 'received',
          payer_name: `User ${settlement.payer_id.slice(0, 8)}...`,
          receiver_name: `User ${settlement.receiver_id.slice(0, 8)}...`
        }));

        // Calculate basic analytics
        const totalPaid = history.filter(h => h.type === 'sent' && h.status === 'approved').reduce((sum, h) => sum + h.amount, 0);
        const totalReceived = history.filter(h => h.type === 'received' && h.status === 'approved').reduce((sum, h) => sum + h.amount, 0);
        const totalTransactions = history.filter(h => h.status === 'approved').length;
        const averageAmount = totalTransactions > 0 ? (totalPaid + totalReceived) / totalTransactions : 0;

        const analytics = {
          total_paid: totalPaid,
          total_received: totalReceived,
          total_transactions: totalTransactions,
          average_amount: averageAmount,
          most_used_method: 'cash', // Default fallback
          monthly_summary: []
        };

        return { history, analytics };
      }
      throw new Error(error.message || 'Failed to fetch settlement history');
    }

    console.log("✅ Settlement history retrieved:", data?.history?.length || 0, "items");
    return data || { history: [], analytics: null };

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