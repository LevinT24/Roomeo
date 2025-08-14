/**
 * Enhanced useChat hook with real-time features, optimistic updates, and typing indicators
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { User } from "@/types/user"
import type { 
  ChatMessage, 
  Chat, 
  TypingEvent, 
  MessageStatusUpdate, 
  OptimisticMessage,
  ConnectionStatus 
} from "@/types/chat"
import { 
  getUserChats, 
  getChatMessages, 
  createOrGetChat,
  markMessagesAsRead,
} from "@/services/chat"
import { 
  realtimeChatService,
  type RealtimeChatEvents 
} from "@/services/realtimeChat"
import { useAuth } from "@/hooks/useAuth"

interface UseEnhancedChatReturn {
  // Core chat data
  chats: Chat[]
  messages: { [chatId: string]: ChatMessage[] }
  
  // Loading states
  isLoading: boolean
  isConnected: boolean
  
  // Typing indicators
  typingUsers: { [chatId: string]: { [userId: string]: boolean } }
  
  // Connection status
  connectionStatus: ConnectionStatus
  
  // Error handling
  error: string | null
  
  // Actions
  sendMessage: (chatId: string, content: string, type?: 'text' | 'image', imageUrl?: string) => Promise<void>
  loadMessages: (chatId: string) => Promise<void>
  createOrGetChatWith: (otherUserId: string) => Promise<Chat | null>
  handleTyping: (chatId: string, isTyping: boolean) => void
  markRead: (chatId: string, messageId?: string) => Promise<void>
  retryMessage: (chatId: string, messageId: string) => Promise<void>
  
  // Subscription management
  subscribeToChat: (chatId: string) => void
  unsubscribeFromChat: (chatId: string) => void
  reconnectAll: () => Promise<void>
  
  // Utilities
  refreshChats: () => Promise<void>
  getUnreadCount: (chatId: string) => number
  getChatMetadata: (chatId: string) => { isTyping: boolean; lastSeen: string | null }
}

export function useEnhancedChat(currentUser: User | null): UseEnhancedChatReturn {
  const { sessionValid } = useAuth()
  
  // Core state
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<{ [chatId: string]: ChatMessage[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Real-time state
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: { [userId: string]: boolean } }>({})
  const [isConnected, setIsConnected] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: true,
    activeSubscriptions: 0,
    connectionQuality: 'excellent'
  })
  
  // Optimistic updates
  const [optimisticMessages, setOptimisticMessages] = useState<{ [chatId: string]: OptimisticMessage[] }>({})
  
  // Refs for cleanup and state management
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const typingTimeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const deduplicationRef = useRef<Set<string>>(new Set())
  
  /**
   * Load user chats
   */
  const loadUserChats = useCallback(async () => {
    if (!currentUser?.id || !sessionValid) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const result = await getUserChats(currentUser.id)
      
      if (result.success && result.chats) {
        setChats(result.chats)
      } else {
        setError(result.error || 'Failed to load chats')
        setChats([])
      }
    } catch (err) {
      setError('Failed to load chats')
      setChats([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id, sessionValid])

  /**
   * Load messages for a chat
   */
  const loadMessages = useCallback(async (chatId: string) => {
    if (!currentUser?.id || !sessionValid) return

    try {
      const result = await getChatMessages(chatId)
      
      if (result.success && result.messages) {
        setMessages(prev => ({
          ...prev,
          [chatId]: result.messages || []
        }))
        
        // Mark messages as read
        await markMessagesAsRead(chatId, currentUser.id)
      } else {
        setError(result.error || 'Failed to load messages')
      }
    } catch (err) {
      setError('Failed to load messages')
    }
  }, [currentUser?.id, sessionValid])

  /**
   * Subscribe to real-time events for a chat
   */
  const subscribeToChat = useCallback((chatId: string) => {
    if (!currentUser?.id || subscriptionsRef.current.has(chatId)) {
      return
    }

    const events: RealtimeChatEvents = {
      message: (message) => {
        // Prevent duplicates
        const messageKey = `${message.chat_id}:${message.id}`
        if (deduplicationRef.current.has(messageKey)) {
          return
        }
        deduplicationRef.current.add(messageKey)
        
        setMessages(prev => {
          const existing = prev[chatId] || []
          const messageExists = existing.some(m => m.id === message.id)
          
          if (messageExists) return prev
          
          return {
            ...prev,
            [chatId]: [...existing, message]
          }
        })
        
        // Remove optimistic message if this was a retry
        if (message.client_id) {
          setOptimisticMessages(prev => ({
            ...prev,
            [chatId]: (prev[chatId] || []).filter(m => m.client_id !== message.client_id)
          }))
        }
      },
      
      messageUpdate: (update) => {
        setMessages(prev => ({
          ...prev,
          [update.chat_id]: (prev[update.chat_id] || []).map(msg =>
            msg.id === update.message_id
              ? { 
                  ...msg, 
                  is_delivered: update.is_delivered ?? msg.is_delivered,
                  is_read: update.is_read ?? msg.is_read 
                }
              : msg
          )
        }))
      },
      
      typing: (event) => {
        if (event.user_id === currentUser.id) return // Ignore own typing
        
        setTypingUsers(prev => ({
          ...prev,
          [event.chat_id]: {
            ...prev[event.chat_id],
            [event.user_id]: event.is_typing
          }
        }))
        
        // Auto-clear typing after timeout
        if (event.is_typing) {
          const timeoutKey = `${event.chat_id}:${event.user_id}`
          
          if (typingTimeoutsRef.current[timeoutKey]) {
            clearTimeout(typingTimeoutsRef.current[timeoutKey])
          }
          
          typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
            setTypingUsers(prev => ({
              ...prev,
              [event.chat_id]: {
                ...prev[event.chat_id],
                [event.user_id]: false
              }
            }))
            delete typingTimeoutsRef.current[timeoutKey]
          }, 3000)
        }
      },
      
      connectionStatus: (connected) => {
        setIsConnected(connected)
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: connected,
          connectionQuality: connected ? 'excellent' : 'offline',
          lastPingTime: connected ? Date.now() : prev.lastPingTime
        }))
      },
      
      error: (err) => {
        console.error('Real-time chat error:', err)
        setError(err.message)
      }
    }

    realtimeChatService.subscribeToChat(chatId, currentUser.id, events)
    subscriptionsRef.current.add(chatId)
    
    setConnectionStatus(prev => ({
      ...prev,
      activeSubscriptions: subscriptionsRef.current.size
    }))
  }, [currentUser?.id])

  /**
   * Unsubscribe from a chat
   */
  const unsubscribeFromChat = useCallback((chatId: string) => {
    realtimeChatService.unsubscribeFromChat(chatId)
    subscriptionsRef.current.delete(chatId)
    
    setConnectionStatus(prev => ({
      ...prev,
      activeSubscriptions: subscriptionsRef.current.size
    }))
  }, [])

  /**
   * Send message with optimistic updates
   */
  const sendMessage = useCallback(async (
    chatId: string, 
    content: string, 
    type: 'text' | 'image' = 'text',
    imageUrl?: string
  ) => {
    if (!currentUser?.id || !content.trim()) return

    const clientId = crypto.randomUUID()
    const tempId = `temp_${Date.now()}_${Math.random()}`
    
    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_delivered: false,
      is_read: true,
      client_id: clientId,
      message_type: type,
      image_url: imageUrl,
      sender_name: currentUser.name,
      sender_avatar: currentUser.profilepicture || '/placeholder.svg',
      isOptimistic: true,
      retryCount: 0
    }
    
    // Add optimistic message to UI
    setOptimisticMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), optimisticMessage]
    }))
    
    try {
      // Send actual message
      const sentMessage = await realtimeChatService.sendMessage(
        chatId,
        currentUser.id,
        content,
        type,
        imageUrl,
        clientId
      )
      
      // Remove optimistic message
      setOptimisticMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(m => m.id !== tempId)
      }))
      
    } catch (err) {
      // Mark optimistic message as failed
      setOptimisticMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          m.id === tempId
            ? { ...m, error: err instanceof Error ? err.message : 'Failed to send' }
            : m
        )
      }))
      
      throw err
    }
  }, [currentUser])

  /**
   * Retry failed message
   */
  const retryMessage = useCallback(async (chatId: string, messageId: string) => {
    const optimistic = optimisticMessages[chatId]?.find(m => m.id === messageId)
    if (!optimistic || !currentUser?.id) return

    // Update retry count
    setOptimisticMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m =>
        m.id === messageId
          ? { ...m, error: undefined, retryCount: (m.retryCount || 0) + 1 }
          : m
      )
    }))

    try {
      await sendMessage(chatId, optimistic.content, optimistic.message_type, optimistic.image_url)
      
      // Remove original failed message
      setOptimisticMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(m => m.id !== messageId)
      }))
    } catch (err) {
      // Mark as failed again
      setOptimisticMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          m.id === messageId
            ? { ...m, error: err instanceof Error ? err.message : 'Retry failed' }
            : m
        )
      }))
    }
  }, [optimisticMessages, currentUser, sendMessage])

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (!currentUser?.id) return
    
    realtimeChatService.sendTypingIndicator(
      chatId,
      currentUser.id,
      currentUser.name || 'Unknown',
      isTyping
    )
  }, [currentUser])

  /**
   * Mark messages as read
   */
  const markRead = useCallback(async (chatId: string, messageId?: string) => {
    if (!currentUser?.id) return

    try {
      if (messageId) {
        await realtimeChatService.markRead(chatId, messageId)
      } else {
        await realtimeChatService.markAllRead(chatId, currentUser.id)
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }, [currentUser?.id])

  /**
   * Create or get chat
   */
  const createOrGetChatWith = useCallback(async (otherUserId: string): Promise<Chat | null> => {
    if (!currentUser?.id || !sessionValid) return null

    try {
      const result = await createOrGetChat(currentUser.id, otherUserId)
      
      if (result.success && result.chat) {
        setChats(prev => {
          const exists = prev.find(chat => chat.id === result.chat!.id)
          if (exists) return prev
          return [result.chat!, ...prev]
        })
        
        return result.chat
      }
      
      return null
    } catch (err) {
      setError('Failed to create chat')
      return null
    }
  }, [currentUser?.id, sessionValid])

  /**
   * Reconnect all subscriptions
   */
  const reconnectAll = useCallback(async () => {
    const activeChats = Array.from(subscriptionsRef.current)
    
    // Unsubscribe from all
    realtimeChatService.unsubscribeFromAll()
    subscriptionsRef.current.clear()
    
    // Resubscribe to active chats
    activeChats.forEach(chatId => {
      subscribeToChat(chatId)
    })
    
    // Reload chats
    await loadUserChats()
  }, [subscribeToChat, loadUserChats])

  /**
   * Get unread message count for a chat
   */
  const getUnreadCount = useCallback((chatId: string): number => {
    const chatMessages = messages[chatId] || []
    return chatMessages.filter(msg => 
      msg.sender_id !== currentUser?.id && !msg.is_read
    ).length
  }, [messages, currentUser?.id])

  /**
   * Get chat metadata
   */
  const getChatMetadata = useCallback((chatId: string) => {
    const typing = typingUsers[chatId] || {}
    const isTyping = Object.values(typing).some(Boolean)
    
    const chatMessages = messages[chatId] || []
    const lastMessage = chatMessages[chatMessages.length - 1]
    const lastSeen = lastMessage ? lastMessage.created_at : null
    
    return { isTyping, lastSeen }
  }, [typingUsers, messages])

  /**
   * Merge optimistic and real messages
   */
  const getAllMessages = useCallback((chatId: string): ChatMessage[] => {
    const realMessages = messages[chatId] || []
    const optimisticMsgs = optimisticMessages[chatId] || []
    
    // Convert optimistic messages to ChatMessage format
    const optimisticAsReal: ChatMessage[] = optimisticMsgs.map(opt => ({
      id: opt.id,
      chat_id: opt.chat_id,
      sender_id: opt.sender_id,
      content: opt.content,
      created_at: opt.created_at,
      is_delivered: opt.is_delivered,
      is_read: opt.is_read,
      client_id: opt.client_id,
      message_type: opt.message_type,
      image_url: opt.image_url,
      image_thumbnail_url: opt.image_thumbnail_url,
      sender_name: opt.sender_name,
      sender_avatar: opt.sender_avatar,
    }))
    
    return [...realMessages, ...optimisticAsReal].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [messages, optimisticMessages])

  // Load chats on mount and user change
  useEffect(() => {
    if (currentUser?.id && sessionValid) {
      loadUserChats()
    } else {
      setChats([])
      setMessages({})
      setOptimisticMessages({})
      setIsLoading(false)
    }
  }, [currentUser?.id, sessionValid, loadUserChats])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realtimeChatService.unsubscribeFromAll()
      Object.values(typingTimeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Create enhanced messages object that includes optimistic messages
  const enhancedMessages = Object.keys(messages).reduce((acc, chatId) => {
    acc[chatId] = getAllMessages(chatId)
    return acc
  }, {} as { [chatId: string]: ChatMessage[] })

  return {
    chats,
    messages: enhancedMessages,
    isLoading,
    isConnected,
    typingUsers,
    connectionStatus,
    error,
    sendMessage,
    loadMessages,
    createOrGetChatWith,
    handleTyping,
    markRead,
    retryMessage,
    subscribeToChat,
    unsubscribeFromChat,
    reconnectAll,
    refreshChats: loadUserChats,
    getUnreadCount,
    getChatMetadata
  }
}