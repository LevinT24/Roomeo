// Enhanced Chat Types for Roommate Features

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: {
    name: string
    profilepicture?: string
  }
}

export interface PinnedMessage {
  id: string
  chat_id: string
  message_id: string
  pinned_by: string
  pinned_at: string
  message?: EnhancedChatMessage
  pinned_by_user?: {
    name: string
    profilepicture?: string
  }
}

export interface MessageAttachment {
  id: string
  message_id: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  thumbnail_url?: string
  uploaded_by: string
  created_at: string
}

export interface ChatPoll {
  id: string
  chat_id: string
  message_id: string
  question: string
  options: PollOption[]
  created_by: string
  expires_at?: string
  multiple_choice: boolean
  created_at: string
  votes?: PollVote[]
  created_by_user?: {
    name: string
    profilepicture?: string
  }
}

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface PollVote {
  id: string
  poll_id: string
  user_id: string
  option_index: number
  created_at: string
  user?: {
    name: string
    profilepicture?: string
  }
}

export interface ChoreAssignment {
  id: string
  chat_id: string
  message_id?: string
  chore_name: string
  assigned_to: string
  assigned_by: string
  due_date?: string
  status: 'pending' | 'completed' | 'overdue'
  completed_at?: string
  created_at: string
  assigned_to_user?: {
    name: string
    profilepicture?: string
  }
  assigned_by_user?: {
    name: string
    profilepicture?: string
  }
}

export interface ChatExpenseSplit {
  id: string
  chat_id: string
  message_id: string
  expense_id?: string
  description: string
  total_amount: number
  created_by: string
  status: 'proposed' | 'accepted' | 'rejected' | 'completed'
  created_at: string
  created_by_user?: {
    name: string
    profilepicture?: string
  }
}

export interface BillReminder {
  id: string
  chat_id: string
  title: string
  description?: string
  amount?: number
  due_date: string
  reminder_frequency: 'daily' | 'weekly' | 'monthly'
  last_reminded?: string
  created_by: string
  is_active: boolean
  created_at: string
  created_by_user?: {
    name: string
    profilepicture?: string
  }
}

export interface MessageMention {
  id: string
  message_id: string
  mentioned_user_id: string
  mentioned_by: string
  is_read: boolean
  created_at: string
  mentioned_user?: {
    name: string
    profilepicture?: string
  }
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'file' 
  | 'poll' 
  | 'expense' 
  | 'chore' 
  | 'system' 
  | 'bill_reminder'

export interface EnhancedChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: MessageType
  metadata: Record<string, any>
  reply_to_id?: string
  edited_at?: string
  is_system_message: boolean
  created_at: string
  is_read: boolean
  sender_name?: string
  sender_avatar?: string
  
  // Enhanced features
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
  mentions?: MessageMention[]
  reply_to?: EnhancedChatMessage
  poll?: ChatPoll
  expense_split?: ChatExpenseSplit
  chore_assignment?: ChoreAssignment
  is_pinned?: boolean
}

export interface EnhancedChat {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
  last_message?: string
  last_message_at?: string
  other_user_name?: string
  other_user_avatar?: string
  
  // Enhanced features
  pinned_messages?: PinnedMessage[]
  active_polls?: ChatPoll[]
  pending_chores?: ChoreAssignment[]
  upcoming_bills?: BillReminder[]
  unread_mentions?: number
}

// UI Component Props
export interface ReactionPickerProps {
  messageId: string
  currentUserId: string
  onReactionAdd: (emoji: string) => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>
  acceptedTypes?: string[]
  maxSize?: number
}

export interface PollCreatorProps {
  onPollCreate: (question: string, options: string[], multipleChoice: boolean, expiresIn?: number) => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export interface ChoreAssignmentProps {
  chatUsers: Array<{ id: string; name: string }>
  onChoreAssign: (choreName: string, assignedTo: string, dueDate?: Date) => Promise<void>
  isOpen: boolean
  onClose: () => void
}

export interface ExpenseSplitProps {
  chatUsers: Array<{ id: string; name: string }>
  onExpenseCreate: (description: string, amount: number, splitWith: string[]) => Promise<void>
  detectedExpense?: { description: string; amount: number }
  isOpen: boolean
  onClose: () => void
}

export interface MentionSuggestion {
  id: string
  name: string
  avatar?: string
}

export interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onFileUpload: (file: File) => Promise<void>
  chatUsers: Array<{ id: string; name: string; avatar?: string }>
  disabled?: boolean
  placeholder?: string
}

// API Response Types
export interface ReactionResponse {
  success: boolean
  reaction?: MessageReaction
  error?: string
}

export interface FileUploadResponse {
  success: boolean
  attachment?: MessageAttachment
  error?: string
}

export interface PollResponse {
  success: boolean
  poll?: ChatPoll
  error?: string
}

export interface ChoreResponse {
  success: boolean
  chore?: ChoreAssignment
  error?: string
}

export interface ExpenseResponse {
  success: boolean
  expense?: ChatExpenseSplit
  error?: string
}

export interface MentionResponse {
  success: boolean
  mention?: MessageMention
  error?: string
}

// Utility Types
export interface ExpenseDetection {
  description: string
  amount: number
  confidence: number
  originalText: string
}

export interface ChoreDetection {
  choreName: string
  assignedTo?: string
  dueDate?: Date
  confidence: number
  originalText: string
}

export interface MentionDetection {
  userId: string
  username: string
  startIndex: number
  endIndex: number
}

// Real-time Events
export type ChatEventType = 
  | 'message_received'
  | 'reaction_added'
  | 'reaction_removed'
  | 'message_pinned'
  | 'message_unpinned'
  | 'poll_created'
  | 'poll_voted'
  | 'chore_assigned'
  | 'chore_completed'
  | 'expense_proposed'
  | 'expense_accepted'
  | 'file_uploaded'
  | 'user_mentioned'

export interface ChatEvent {
  type: ChatEventType
  chatId: string
  userId: string
  data: any
  timestamp: string
}

// Bot Configuration
export interface BillReminderBot {
  enabled: boolean
  reminderDays: number[]
  reminderTime: string
  customMessage?: string
}

export interface ChatBotConfig {
  billReminders: BillReminderBot
  expenseDetection: {
    enabled: boolean
    minAmount: number
    keywords: string[]
  }
  choreDetection: {
    enabled: boolean
    keywords: string[]
  }
}