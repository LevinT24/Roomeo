// services/expenses.ts - Fixed getExpenseDashboardData function
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

// FIXED: Use the SQL function that already includes participants data
export async function getExpenseSummary(userId?: string): Promise<ExpenseSummary[]> {
  try {
    console.log("📄 Fetching expense summary for user:", userId || "current user");

    // Ensure user is authenticated  
    const user = await ensureAuthenticated();

    // Use the SQL function that has the correct structure with participants
    const { data, error } = await supabase.rpc('get_expense_summary', {
      p_user_id: userId || user.id
    });

    if (error) {
      console.error("❌ Error fetching expense summary:", error);
      throw new Error(error.message || "Failed to fetch expense summary");
    }

    console.log("✅ Expense summary retrieved:", data?.length || 0, "groups");
    console.log("🔍 Sample expense with participants:", data?.[0]?.participants);
    
    return data || [];
  } catch (error) {
    console.error("❌ Exception fetching expense summary:", error);
    return [];
  }
}

// FIXED: Simplified function that properly fetches participant data
async function getExpenseSummaryWithParticipants(userId: string, eventRooms?: boolean): Promise<ExpenseSummary[]> {
  try {
    console.log("📄 Fetching expense summary with participants", { userId, eventRooms });

    // Build the base query
    let query = supabase
      .from('expense_groups')
      .select(`
        id,
        name,
        description,
        total_amount,
        created_by,
        created_at,
        status,
        event_id,
        users!expense_groups_created_by_fkey(name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply event filtering
    if (eventRooms === true) {
      query = query.not('event_id', 'is', null);
    } else if (eventRooms === false) {
      query = query.is('event_id', null);
    }

    // Get all expense groups first
    const { data: expenseGroups, error: expenseGroupsError } = await query;

    if (expenseGroupsError) {
      console.error("❌ Error fetching expense groups:", expenseGroupsError);
      throw expenseGroupsError;
    }

    if (!expenseGroups || expenseGroups.length === 0) {
      console.log("📋 No expense groups found");
      return [];
    }

    // Get all participants for all groups in one query
    const groupIds = expenseGroups.map(g => g.id);
    const { data: allParticipants, error: participantsError } = await supabase
      .from('expense_participants')
      .select(`
        group_id,
        user_id,
        amount_owed,
        amount_paid,
        is_settled,
        users!inner(
          name,
          profilepicture
        )
      `)
      .in('group_id', groupIds);

    if (participantsError) {
      console.error("❌ Error fetching participants:", participantsError);
      throw participantsError;
    }

    console.log("🔍 All participants fetched:", allParticipants?.length || 0);

    // Get pending settlements for all groups in one query
    const { data: allSettlements, error: settlementsError } = await supabase
      .from('settlements')
      .select('*')
      .in('group_id', groupIds)
      .eq('status', 'pending');

    if (settlementsError) {
      console.error("❌ Error fetching settlements:", settlementsError);
    }

    // Group participants and settlements by group_id
    const participantsByGroup = new Map();
    const settlementsByGroup = new Map();

    (allParticipants || []).forEach(participant => {
      if (!participantsByGroup.has(participant.group_id)) {
        participantsByGroup.set(participant.group_id, []);
      }
      participantsByGroup.get(participant.group_id).push(participant);
    });

    (allSettlements || []).forEach(settlement => {
      if (!settlementsByGroup.has(settlement.group_id)) {
        settlementsByGroup.set(settlement.group_id, []);
      }
      settlementsByGroup.get(settlement.group_id).push(settlement);
    });

    // Build the expense summary with participants
    const expenseSummaries: ExpenseSummary[] = [];

    for (const group of expenseGroups) {
      const groupParticipants = participantsByGroup.get(group.id) || [];
      const groupSettlements = settlementsByGroup.get(group.id) || [];
      
      // Find current user's participation
      const userParticipant = groupParticipants.find(p => p.user_id === userId);
      
      // Skip groups where user is not a participant
      if (!userParticipant) {
        console.log(`⏭️ Skipping group ${group.name} - user not a participant`);
        continue;
      }

      // Map participants to the correct format
      const participants = groupParticipants.map(participant => ({
        user_id: participant.user_id,
        name: (participant as any).users?.name || 'Unknown User',
        profile_picture: (participant as any).users?.profilepicture,
        amount_owed: participant.amount_owed,
        amount_paid: participant.amount_paid,
        is_settled: participant.is_settled,
        is_creator: participant.user_id === group.created_by
      }));

      // Find user's pending settlement
      const userPendingSettlement = groupSettlements.find(s => s.payer_id === userId);

      // Handle the case where users relationship might return an array
      const creatorUser = Array.isArray((group as any).users) 
        ? (group as any).users[0] 
        : (group as any).users;

      const expenseSummary: ExpenseSummary = {
        group_id: group.id,
        group_name: group.name,
        group_description: group.description,
        total_amount: group.total_amount,
        amount_owed: userParticipant.amount_owed,
        amount_paid: userParticipant.amount_paid,
        is_settled: userParticipant.is_settled,
        created_by_name: creatorUser?.name || 'Unknown',
        created_by_id: group.created_by,
        created_at: group.created_at,
        group_status: group.status,
        event_id: group.event_id,
        participants: participants, // This is the key fix - ensuring participants are included
        pending_settlement: userPendingSettlement ? {
          settlement_id: userPendingSettlement.id,
          amount: userPendingSettlement.amount,
          payment_method: userPendingSettlement.payment_method,
          status: userPendingSettlement.status,
          created_at: userPendingSettlement.created_at
        } : undefined,
        pending_settlements_count: groupSettlements.length
      };

      expenseSummaries.push(expenseSummary);
    }

    console.log("✅ Expense summaries with participants:", expenseSummaries.length);
    console.log("🔍 Sample participants in first group:", expenseSummaries[0]?.participants);
    
    return expenseSummaries;
  } catch (error) {
    console.error("❌ Exception fetching expense summary with participants:", error);
    return [];
  }
}

// FIXED: Updated room functions to use the new implementation
export async function getAllRooms(userId?: string): Promise<ExpenseSummary[]> {
  try {
    console.log("📄 Fetching all rooms (regular + event)");
    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;
    
    const expenseSummary = await getExpenseSummaryWithParticipants(targetUserId); // Get all rooms
    
    console.log("✅ All rooms retrieved:", expenseSummary.length);
    return expenseSummary;
  } catch (error) {
    console.error("❌ Exception fetching all rooms:", error);
    return [];
  }
}

export async function getRegularRooms(userId?: string): Promise<ExpenseSummary[]> {
  try {
    console.log("📄 Fetching regular rooms (event_id = NULL)");
    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;
    
    const expenseSummary = await getExpenseSummaryWithParticipants(targetUserId, false); // Regular rooms only
    
    console.log("✅ Regular rooms retrieved:", expenseSummary.length);
    return expenseSummary;
  } catch (error) {
    console.error("❌ Exception fetching regular rooms:", error);
    return [];
  }
}

export async function getEventRooms(userId?: string): Promise<ExpenseSummary[]> {
  try {
    console.log("📄 Fetching event rooms (event_id IS NOT NULL)");
    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;
    
    const expenseSummary = await getExpenseSummaryWithParticipants(targetUserId, true); // Event rooms only
    
    console.log("✅ Event rooms retrieved:", expenseSummary.length);
    return expenseSummary;
  } catch (error) {
    console.error("❌ Exception fetching event rooms:", error);
    return [];
  }
}

// FIXED: Simplified dashboard data function
export async function getExpenseDashboardData(userId?: string): Promise<ExpenseDashboardData> {
  try {
    console.log("📄 Fetching expense dashboard data");

    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;

    // Get all rooms with participants and pending settlements
    const [allRooms, pendingSettlements] = await Promise.all([
      getAllRooms(targetUserId),
      getPendingSettlements(targetUserId)
    ]);

    // Calculate totals from all rooms
    const total_owed = allRooms.reduce((sum, expense) => 
      sum + (expense.amount_owed - expense.amount_paid), 0
    );

    const total_to_receive = pendingSettlements.reduce((sum, settlement) => 
      sum + settlement.amount, 0
    );

    const dashboardData: ExpenseDashboardData = {
      active_expenses: allRooms,
      pending_settlements: pendingSettlements,
      total_owed,
      total_to_receive
    };

    console.log("✅ Dashboard data compiled:", {
      active_expenses: dashboardData.active_expenses.length,
      pending_settlements: dashboardData.pending_settlements.length,
      total_owed: dashboardData.total_owed,
      total_to_receive: dashboardData.total_to_receive,
      sample_participants: dashboardData.active_expenses[0]?.participants?.length || 0
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

// Keep all other existing functions unchanged...
export async function createExpenseGroup(
  data: CreateExpenseGroupRequest & { event_id?: string }
): Promise<CreateExpenseGroupResponse> {
  try {
    console.log("📄 Creating expense group:", data);

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
    // ULTRA SIMPLE: Use different functions for event vs regular rooms
    let result: string;
    
    if (data.event_id) {
      // EVENT ROOM: Use the bulletproof event room function
      const { data: eventResult, error } = await supabase.rpc('create_event_room', {
        p_name: data.name,
        p_total_amount: data.total_amount,
        p_selected_friends: data.participants, // Friends selected in UI
        p_event_id: data.event_id,
        p_description: data.description || null
      });

      if (error) {
        console.error("❌ Error creating event room:", error);
        throw new Error(error.message || "Failed to create event room");
      }

      result = eventResult;
      console.log("✅ Event room created with ID:", result);
    } else {
      // REGULAR ROOM: Use the regular room function
      const { data: regularResult, error } = await supabase.rpc('create_regular_room', {
        p_name: data.name,
        p_total_amount: data.total_amount,
        p_participants: data.participants,
        p_description: data.description || null,
        p_split_type: data.split_type,
        p_custom_amounts: data.custom_amounts || null,
        p_create_group_chat: false
      });

      if (error) {
        console.error("❌ Error creating regular room:", error);
        throw new Error(error.message || "Failed to create regular room");
      }

      result = regularResult;
      console.log("✅ Regular room created with ID:", result);
    }

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
    console.log("📄 Submitting settlement:", data);

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
    console.log("📄 Calling submit_settlement function with params:", {
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
    console.log("📄 Approving settlement:", data);

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

export async function getPendingSettlements(userId?: string): Promise<PendingSettlement[]> {
  try {
    console.log("📄 Fetching pending settlements for user:", userId || "current user");

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

export async function markParticipantPayment(
  groupId: string,
  userId: string,
  markAsPaid: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log(`📄 Marking participant payment: ${markAsPaid ? 'paid' : 'unpaid'}`, { groupId, userId });

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
  console.log("📄 Setting up expense real-time subscriptions");

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
  console.log("📄 Refreshing dashboard data after settlement action");
  return await getExpenseDashboardData(userId);
}

// Get room details by ID for event context (includes all participants)
export async function getRoomDetailsById(roomId: string): Promise<ExpenseSummary | null> {
  try {
    console.log("📄 Fetching room details by ID:", roomId);

    // Ensure user is authenticated
    await ensureAuthenticated();

    // Call database to get room details with all participants
    const { data, error } = await supabase
      .from('expense_groups')
      .select(`
        id,
        name,
        description,
        total_amount,
        status,
        created_at,
        created_by,
        event_id,
        creator:users!expense_groups_created_by_fkey (
          id,
          name,
          profilepicture
        ),
        expense_participants (
          user_id,
          amount_owed,
          amount_paid,
          is_settled,
          participant:users!expense_participants_user_id_fkey (
            id,
            name,
            profilepicture
          )
        )
      `)
      .eq('id', roomId)
      .single();

    if (error) {
      console.error("❌ Error fetching room details:", error);
      if (error.code === 'PGRST116') {
        return null; // Room not found
      }
      throw new Error(error.message || "Failed to fetch room details");
    }

    if (!data) {
      return null;
    }

    // Transform the data to match ExpenseSummary interface
    const roomDetails: ExpenseSummary = {
      group_id: data.id,
      group_name: data.name,
      group_description: data.description,
      total_amount: data.total_amount,
      amount_owed: 0, // Will be calculated for current user if they're a participant
      amount_paid: 0, // Will be calculated for current user if they're a participant
      is_settled: data.status === 'settled',
      created_by_name: (data as any).creator?.name || 'Unknown',
      created_by_id: data.created_by,
      created_at: data.created_at,
      group_status: data.status,
      pending_settlements_count: 0,
      participants: data.expense_participants.map(p => ({
        user_id: p.user_id,
        name: (p as any).participant?.name || 'Unknown User',
        profile_picture: (p as any).participant?.profilepicture,
        amount_owed: p.amount_owed,
        amount_paid: p.amount_paid,
        is_settled: p.is_settled,
        is_creator: p.user_id === data.created_by
      }))
    };

    console.log("✅ Room details retrieved:", roomDetails);
    return roomDetails;
  } catch (error) {
    console.error("❌ Exception fetching room details:", error);
    return null;
  }
}

// Settlement History and Analytics - Fixed to use expense_participants table
export async function getSettlementHistory(userId?: string): Promise<{
  history: any[],
  analytics: any
}> {
  try {
    console.log("📄 Fetching settlement history from expense_participants table");

    const user = await ensureAuthenticated();
    const targetUserId = userId || user.id;
    
    console.log("🔍 Target User ID:", targetUserId);
    console.log("🔍 Auth User:", user);
    console.log("🔍 Expected user from your data: 93facc69-9391-4c51-9718-364d7b8d80e0");

    // First, let's see ALL settled participants in the database - try both TRUE and true
    const { data: allSettledParticipants, error: allSettledError } = await supabase
      .from('expense_participants')
      .select('user_id, group_id, amount_owed, amount_paid, is_settled')
      .in('is_settled', [true, 'TRUE', 'true']);

    console.log("📊 ALL settled participants in database:", {
      count: allSettledParticipants?.length || 0,
      data: allSettledParticipants
    });

    // Get settled participants - show all settlements in groups where current user participates
    // First get all groups where current user is a participant
    const { data: userGroups, error: userGroupsError } = await supabase
      .from('expense_participants')
      .select('group_id')
      .eq('user_id', targetUserId);

    const groupIds = (userGroups || []).map(g => g.group_id);
    
    console.log("🔍 User's groups:", groupIds);

    // Now get ALL settled participants from those groups
    const { data: settledParticipants, error: settledError } = await supabase
      .from('expense_participants')
      .select(`
        *,
        expense_groups!group_id(
          name,
          created_by,
          created_at,
          users!created_by(name)
        ),
        users!user_id(name)
      `)
      .in('group_id', groupIds.length > 0 ? groupIds : [''])
      .in('is_settled', [true, 'TRUE', 'true'])
      .order('joined_at', { ascending: false });

    if (settledError) {
      console.error("❌ Error fetching settled participants:", settledError);
      throw new Error(settledError.message || 'Failed to fetch settlement history');
    }

    console.log("📊 Settled participants found:", {
      count: settledParticipants?.length || 0,
      data: settledParticipants?.map(p => ({
        group_name: (p.expense_groups as any)?.name,
        amount_owed: p.amount_owed,
        amount_paid: p.amount_paid,
        is_settled: p.is_settled,
        total_amount_from_group: (p.expense_groups as any)?.total_amount
      }))
    });

    // Transform settled participants into settlement history
    const settlementHistory = (settledParticipants || []).map(participant => {
      const group = participant.expense_groups as any;
      
      // Convert database values to numbers and use the correct field
      const amountOwed = parseFloat(participant.amount_owed) || 0;
      const amountPaid = parseFloat(participant.amount_paid) || 0;
      const groupTotal = parseFloat(group?.total_amount) || 0;
      
      // Use amount_paid if it's greater than 0, otherwise use amount_owed
      let settledAmount = 0;
      
      if (amountPaid > 0) {
        settledAmount = amountPaid;
      } else if (amountOwed > 0) {
        settledAmount = amountOwed;
      } else if (groupTotal > 0) {
        // Last resort: calculate equal split from group total
        settledAmount = groupTotal / 2; // Assuming equal split
      }
      
      console.log(`🔍 Settlement calculation for ${group?.name}:`, {
        raw_amount_owed: participant.amount_owed,
        raw_amount_paid: participant.amount_paid,
        parsed_amount_owed: amountOwed,
        parsed_amount_paid: amountPaid,
        group_total: groupTotal,
        calculated_amount: settledAmount,
        participant_data: participant
      });
      
      // Determine if this is money you sent or received
      const isCurrentUser = participant.user_id === targetUserId;
      const transactionType = isCurrentUser ? 'sent' : 'received';
      
      return {
        id: `settled_${participant.id}`,
        group_name: group?.name || `Group ${participant.group_id.slice(0, 8)}...`,
        amount: settledAmount,
        payment_method: 'manual',
        status: 'approved',
        created_at: participant.joined_at,
        approved_at: participant.joined_at,
        type: transactionType, // 'sent' if you paid, 'received' if someone paid you
        payer_name: participant.users?.name || `User ${participant.user_id.slice(0, 8)}...`,
        receiver_name: group?.users?.name || 'Group Creator',
        source: 'settled_payment'
      };
    });

    // Calculate analytics properly
    const totalPaid = settlementHistory.filter(h => h.type === 'sent').reduce((sum, h) => sum + h.amount, 0);
    const totalReceived = settlementHistory.filter(h => h.type === 'received').reduce((sum, h) => sum + h.amount, 0);
    const totalTransactions = settlementHistory.length;
    const averageAmount = totalTransactions > 0 ? (totalPaid + totalReceived) / totalTransactions : 0;

    const analytics = {
      total_paid: totalPaid,
      total_received: totalReceived,
      total_transactions: totalTransactions,
      average_amount: averageAmount,
      most_used_method: 'manual',
      monthly_summary: []
    };

    console.log("✅ Settlement history retrieved:", settlementHistory.length, "settled payments");
    console.log("🔍 Settlement history items:", settlementHistory.map(h => ({ group_name: h.group_name, amount: h.amount, status: h.status })));
    
    return { history: settlementHistory, analytics };

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
    console.log(`📄 Exporting expense report as ${format}`);

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