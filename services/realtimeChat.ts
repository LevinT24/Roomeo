/**
 * RealtimeChatService - Professional real-time messaging service
 * Handles all real-time operations including subscriptions, typing indicators, and status updates
 */

import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeMessage {
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

export interface RealtimeChatEvents {
  message: (message: RealtimeMessage) => void
  messageUpdate: (update: MessageStatusUpdate) => void
  typing: (event: TypingEvent) => void
  userOnline: (userId: string) => void
  userOffline: (userId: string) => void
  connectionStatus: (connected: boolean) => void
  error: (error: Error) => void
}

/**
 * Real-time chat service class for handling all real-time operations
 */
export class RealtimeChatService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private eventListeners: Map<string, Partial<RealtimeChatEvents>> = new Map()
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private isConnected: boolean = true
  
  /**
   * Subscribe to real-time events for a specific chat
   */
  async subscribeToChat(
    chatId: string, 
    userId: string,
    events: Partial<RealtimeChatEvents>
  ): Promise<void> {
    try {
      // Clean up existing subscription if any
      this.unsubscribeFromChat(chatId)

      // Store event listeners
      this.eventListeners.set(chatId, events)

      // Create channel for this chat
      const channel = supabase.channel(`chat:${chatId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      })

      // Subscribe to message inserts
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const newMessage = payload.new as any
            
            // Fetch complete message with sender info
            const { data: messageWithSender, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users!messages_sender_id_fkey(name, profilepicture)
              `)
              .eq('id', newMessage.id)
              .single()

            if (messageWithSender && !error) {
              const realtimeMessage: RealtimeMessage = {
                ...messageWithSender,
                sender_name: messageWithSender.sender?.name || 'Unknown',
                sender_avatar: messageWithSender.sender?.profilepicture || '/placeholder.svg'
              }
              
              events.message?.(realtimeMessage)
              
              // Auto-mark as delivered if it's not from current user
              if (messageWithSender.sender_id !== userId) {
                setTimeout(() => {
                  this.markDelivered(chatId, messageWithSender.id)
                }, 500)
              }
            }
          } catch (error) {
            console.error('Error processing new message:', error)
            events.error?.(error as Error)
          }
        }
      )

      // Subscribe to message updates (status changes)
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const updatedMessage = payload.new as any
            
            const statusUpdate: MessageStatusUpdate = {
              message_id: updatedMessage.id,
              chat_id: updatedMessage.chat_id,
              is_delivered: updatedMessage.is_delivered,
              is_read: updatedMessage.is_read
            }
            
            events.messageUpdate?.(statusUpdate)
          } catch (error) {
            console.error('Error processing message update:', error)
            events.error?.(error as Error)
          }
        }
      )

      // Subscribe to typing indicators via broadcast
      channel.on('broadcast', { event: 'typing' }, (payload) => {
        try {
          const typingEvent = payload.payload as TypingEvent
          events.typing?.(typingEvent)
        } catch (error) {
          console.error('Error processing typing event:', error)
        }
      })

      // Handle presence (online/offline status)
      channel.on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState()
          Object.keys(state).forEach(userId => {
            events.userOnline?.(userId)
          })
        } catch (error) {
          console.error('Error processing presence sync:', error)
        }
      })

      channel.on('presence', { event: 'join' }, ({ key }) => {
        events.userOnline?.(key)
      })

      channel.on('presence', { event: 'leave' }, ({ key }) => {
        events.userOffline?.(key)
      })

      // Subscribe and track connection status
      const subscriptionStatus = await channel.subscribe(async (status) => {
        console.log(`Chat ${chatId} subscription status:`, status)
        
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          this.reconnectAttempts.set(chatId, 0)
          events.connectionStatus?.(true)
          
          // Track presence
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
          
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.isConnected = false
          events.connectionStatus?.(false)
          
          // Attempt reconnection
          this.attemptReconnection(chatId, userId, events)
        }
      })

      // Store the channel
      this.channels.set(chatId, channel)
      
      console.log(`✅ Subscribed to chat: ${chatId}`)
      
    } catch (error) {
      console.error(`Failed to subscribe to chat ${chatId}:`, error)
      events.error?.(error as Error)
      throw error
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(
    chatId: string, 
    userId: string, 
    userName: string, 
    isTyping: boolean
  ): Promise<void> {
    try {
      const channel = this.channels.get(chatId)
      if (!channel) {
        throw new Error(`No active channel for chat ${chatId}`)
      }

      const typingEvent: TypingEvent = {
        chat_id: chatId,
        user_id: userId,
        user_name: userName,
        is_typing: isTyping,
        timestamp: Date.now()
      }

      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: typingEvent
      })

      // Auto-stop typing after 2 seconds
      if (isTyping) {
        const timeoutKey = `${chatId}:${userId}`
        
        // Clear existing timeout
        const existingTimeout = this.typingTimeouts.get(timeoutKey)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        // Set new timeout
        const timeout = setTimeout(() => {
          this.sendTypingIndicator(chatId, userId, userName, false)
          this.typingTimeouts.delete(timeoutKey)
        }, 2000)
        
        this.typingTimeouts.set(timeoutKey, timeout)
      }

    } catch (error) {
      console.error('Failed to send typing indicator:', error)
      const events = this.eventListeners.get(chatId)
      events?.error?.(error as Error)
    }
  }

  /**
   * Mark message as delivered
   */
  async markDelivered(chatId: string, messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_delivered: true })
        .eq('id', messageId)
        .eq('chat_id', chatId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to mark message as delivered:', error)
      const events = this.eventListeners.get(chatId)
      events?.error?.(error as Error)
    }
  }

  /**
   * Mark message as read
   */
  async markRead(chatId: string, messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_delivered: true,
          is_read: true 
        })
        .eq('id', messageId)
        .eq('chat_id', chatId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      const events = this.eventListeners.get(chatId)
      events?.error?.(error as Error)
    }
  }

  /**
   * Mark all messages in chat as read
   */
  async markAllRead(chatId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        p_chat_id: chatId,
        p_user_id: userId
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to mark all messages as read:', error)
      const events = this.eventListeners.get(chatId)
      events?.error?.(error as Error)
    }
  }

  /**
   * Send message with optimistic updates
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' = 'text',
    imageUrl?: string,
    clientId?: string
  ): Promise<RealtimeMessage> {
    try {
      const messageData = {
        chat_id: chatId,
        sender_id: senderId,
        content: content.trim(),
        message_type: messageType,
        image_url: imageUrl,
        client_id: clientId || crypto.randomUUID(),
        created_at: new Date().toISOString()
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!messages_sender_id_fkey(name, profilepicture)
        `)
        .single()

      if (error) {
        throw error
      }

      const realtimeMessage: RealtimeMessage = {
        ...message,
        sender_name: message.sender?.name || 'Unknown',
        sender_avatar: message.sender?.profilepicture || '/placeholder.svg'
      }

      return realtimeMessage
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from chat
   */
  unsubscribeFromChat(chatId: string): void {
    try {
      const channel = this.channels.get(chatId)
      if (channel) {
        supabase.removeChannel(channel)
        this.channels.delete(chatId)
        this.eventListeners.delete(chatId)
        
        // Clear typing timeouts
        const timeoutKeys = Array.from(this.typingTimeouts.keys())
          .filter(key => key.startsWith(`${chatId}:`))
        
        timeoutKeys.forEach(key => {
          const timeout = this.typingTimeouts.get(key)
          if (timeout) {
            clearTimeout(timeout)
            this.typingTimeouts.delete(key)
          }
        })
        
        console.log(`✅ Unsubscribed from chat: ${chatId}`)
      }
    } catch (error) {
      console.error(`Failed to unsubscribe from chat ${chatId}:`, error)
    }
  }

  /**
   * Unsubscribe from all chats
   */
  unsubscribeFromAll(): void {
    try {
      const chatIds = Array.from(this.channels.keys())
      chatIds.forEach(chatId => {
        this.unsubscribeFromChat(chatId)
      })
      
      // Clear all timeouts
      this.typingTimeouts.forEach(timeout => clearTimeout(timeout))
      this.typingTimeouts.clear()
      
      console.log('✅ Unsubscribed from all chats')
    } catch (error) {
      console.error('Failed to unsubscribe from all chats:', error)
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.channels.size
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(
    chatId: string, 
    userId: string, 
    events: Partial<RealtimeChatEvents>
  ): Promise<void> {
    const currentAttempts = this.reconnectAttempts.get(chatId) || 0
    const maxAttempts = 5
    
    if (currentAttempts >= maxAttempts) {
      console.error(`Max reconnection attempts reached for chat ${chatId}`)
      events.error?.(new Error('Connection failed after maximum retry attempts'))
      return
    }

    const delay = Math.min(1000 * Math.pow(2, currentAttempts), 10000) // Max 10s
    
    console.log(`Attempting reconnection ${currentAttempts + 1}/${maxAttempts} for chat ${chatId} in ${delay}ms`)
    
    setTimeout(async () => {
      try {
        this.reconnectAttempts.set(chatId, currentAttempts + 1)
        await this.subscribeToChat(chatId, userId, events)
      } catch (error) {
        console.error(`Reconnection attempt ${currentAttempts + 1} failed for chat ${chatId}:`, error)
        // Will retry on next failure
      }
    }, delay)
  }
}

// Create singleton instance
export const realtimeChatService = new RealtimeChatService()

// Export convenience functions
export const subscribeToChat = realtimeChatService.subscribeToChat.bind(realtimeChatService)
export const unsubscribeFromChat = realtimeChatService.unsubscribeFromChat.bind(realtimeChatService)
export const sendTypingIndicator = realtimeChatService.sendTypingIndicator.bind(realtimeChatService)
export const markDelivered = realtimeChatService.markDelivered.bind(realtimeChatService)
export const markRead = realtimeChatService.markRead.bind(realtimeChatService)
export const markAllRead = realtimeChatService.markAllRead.bind(realtimeChatService)
export const sendMessage = realtimeChatService.sendMessage.bind(realtimeChatService)