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
      p_create_group_chat: data.create_group_chat || false
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

    // Prevent creators from submitting settlements to themselves
    const { data: groupData, error: groupError } = await supabase
      .from('expense_groups')
      .select('created_by')
      .eq('id', data.group_id)
      .single();

    if (groupError) {
      throw new Error("Failed to verify expense group");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user && groupData.created_by === user.id) {
      throw new Error("Creators cannot submit settlements to themselves. Use the checkmark buttons to mark payments as received.");
    }

    // Call database function to submit settlement
    const { data: result, error } = await supabase.rpc('submit_settlement', {
      p_group_id: data.group_id,
      p_amount: data.amount,
      p_payment_method: data.payment_method,
      p_proof_image: data.proof_image || null,
      p_notes: data.notes || null
    });

    if (error) {
      console.error("❌ Error submitting settlement:", error);
      throw new Error(error.message || "Failed to submit settlement");
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

    const { data, error } = await supabase
      .from('settlements')
      .select(`
        id,
        amount,
        payment_method,
        status,
        created_at,
        proof_image,
        notes,
        expense_groups!inner(name),
        users!settlements_payer_id_fkey(name)
      `)
      .eq('status', 'pending')
      .eq('receiver_id', userId || user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching pending settlements:", error);
      throw new Error(error.message || "Failed to fetch pending settlements");
    }

    const pendingSettlements: PendingSettlement[] = (data || []).map(settlement => ({
      settlement_id: settlement.id,
      group_name: settlement.expense_groups.name,
      payer_name: settlement.users.name,
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

export async function getSettlementHistory(userId?: string, limit: number = 50): Promise<Settlement[]> {
  try {
    console.log("🔄 Fetching settlement history");

    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    const currentUserId = userId || user.id;
    
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .or(`payer_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Error fetching settlement history:", error);
      throw new Error(error.message || "Failed to fetch settlement history");
    }

    console.log("✅ Settlement history retrieved:", data?.length || 0, "settlements");
    return data || [];
  } catch (error) {
    console.error("❌ Exception fetching settlement history:", error);
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