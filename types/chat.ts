export interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  is_delivered: boolean
  is_read: boolean
  client_id?: string
  message_type: 'text' | 'image'
  image_url?: string
  image_thumbnail_url?: string
  sender_name?: string
  sender_avatar?: string
}

export interface Chat {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
  last_message?: string
  last_message_at?: string
  last_message_preview?: string
  other_user_name?: string
  other_user_avatar?: string
  is_active?: boolean
}

export interface RealtimePayload<T = any> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors: any[]
}

export interface TypingEvent {
  chat_id: string
  user_id: string
  user_name: string
  is_typing: boolean
  timestamp: number
}

export interface MessageStatusUpdate {
  message_id: string
  chat_id: string
  is_delivered?: boolean
  is_read?: boolean
}

export interface ChatMetadata {
  unreadCount: number
  lastActivity: string
  participants: string[]
  isTyping: { [userId: string]: boolean }
}

export interface MediaMessage extends ChatMessage {
  message_type: 'image'
  image_url: string
  image_thumbnail_url?: string
}

export interface OptimisticMessage extends Omit<ChatMessage, 'id'> {
  id: string
  isOptimistic: boolean
  error?: string
  retryCount?: number
}

export interface ConnectionStatus {
  isConnected: boolean
  activeSubscriptions: number
  lastPingTime?: number
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
}
