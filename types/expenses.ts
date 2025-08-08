// Expense sharing types for Splitwise feature

export type SplitType = 'equal' | 'custom'
export type ExpenseStatus = 'active' | 'settled' | 'cancelled'
export type SettlementStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'cash' | 'zelle' | 'venmo' | 'paypal' | 'bank_transfer'

export interface ExpenseGroup {
  id: string
  name: string
  description?: string
  created_by: string
  total_amount: number
  split_type: SplitType
  has_group_chat: boolean
  chat_id?: string
  status: ExpenseStatus
  created_at: string
  updated_at: string
}

export interface ExpenseParticipant {
  id: string
  group_id: string
  user_id: string
  amount_owed: number
  amount_paid: number
  is_settled: boolean
  joined_at: string
}

export interface Settlement {
  id: string
  group_id: string
  payer_id: string
  receiver_id: string
  amount: number
  payment_method: PaymentMethod
  status: SettlementStatus
  proof_image?: string
  notes?: string
  created_at: string
  approved_at?: string
}

export interface ChatParticipant {
  id: string
  chat_id: string
  user_id: string
  joined_at: string
}

// API Request/Response types
export interface CreateExpenseGroupRequest {
  name: string
  description?: string
  total_amount: number
  split_type: SplitType
  participants: string[] // user IDs
  custom_amounts?: number[]
  create_group_chat?: boolean
}

export interface CreateExpenseGroupResponse {
  group_id: string
  success: boolean
  message?: string
}

export interface SubmitSettlementRequest {
  group_id: string
  amount: number
  payment_method: PaymentMethod
  proof_image?: string
  notes?: string
}

export interface SubmitSettlementResponse {
  settlement_id: string
  success: boolean
  message?: string
}

export interface ApproveSettlementRequest {
  settlement_id: string
  approved: boolean
}

export interface ApproveSettlementResponse {
  success: boolean
  approved: boolean
  message?: string
}

// Dashboard data types
export interface ExpenseParticipantSummary {
  user_id: string
  name: string
  profile_picture?: string
  amount_owed: number
  amount_paid: number
  is_settled: boolean
  is_creator: boolean
}

export interface ExpenseSummary {
  group_id: string
  group_name: string
  group_description?: string
  total_amount: number
  amount_owed: number
  amount_paid: number
  is_settled: boolean
  created_by_name: string
  created_at: string
  group_status: ExpenseStatus
  participants?: ExpenseParticipantSummary[]
}

export interface PendingSettlement {
  settlement_id: string
  group_name: string
  payer_name: string
  amount: number
  payment_method: PaymentMethod
  status: SettlementStatus
  created_at: string
  proof_image?: string
  notes?: string
}

export interface ExpenseDashboardData {
  active_expenses: ExpenseSummary[]
  pending_settlements: PendingSettlement[]
  total_owed: number
  total_to_receive: number
}

// Component props types
export interface ExpenseCardProps {
  expense: ExpenseSummary
  onSettleUp: (groupId: string) => void
  currentUserId: string
  onMarkPaid?: (groupId: string, userId: string, paid: boolean) => void
}

export interface SettlementCardProps {
  settlement: PendingSettlement
  onApprove?: (settlementId: string, approved: boolean) => void
  currentUserId: string
}

export interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  friends: Array<{
    id: string
    name: string
    profilePicture?: string
  }>
  onCreateExpense: (data: CreateExpenseGroupRequest) => Promise<void>
}

export interface SettleUpModalProps {
  isOpen: boolean
  onClose: () => void
  expense: ExpenseSummary
  onSubmitSettlement: (data: SubmitSettlementRequest) => Promise<void>
}

// Error types
export interface ExpenseError {
  code: string
  message: string
  details?: any
}

// Notification data for expenses
export interface ExpenseNotificationData {
  expense_group_id: string
  expense_name: string
  amount?: number
  settlement_id?: string
}