// hooks/useChat.ts - Enhanced chat with session recovery
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { User } from "@/types/user"
import { 
  getUserEnhancedChats as getUserChats, 
  getEnhancedMessages, 
  sendEnhancedMessage as sendChatMessage, 
  createOrGetEnhancedChat as createOrGetChat,
  subscribeToMessages,
  unsubscribeFromMessages,
  markMessagesAsRead,
  type EnhancedChatMessage as ChatMessage,
  type Chat
} from "@/services/enhanced-chat"
import { useAuth } from "@/hooks/useAuth"

export function useChat(currentUser: User | null) {
  const { sessionValid } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<{ [chatId: string]: ChatMessage[] }>({})
  const [loading, setLoading] = useState(true)
  const [activeSubscriptions, setActiveSubscriptions] = useState<{ [chatId: string]: RealtimeChannel }>({})
  const [pendingChatCreations, setPendingChatCreations] = useState<Set<string>>(new Set())
  
  // Refs for state management
  const lastUserIdRef = useRef<string | null>(null)
  const connectionRetryRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef<{ [chatId: string]: number }>({})

  // Load user chats with session validation
  const loadUserChats = useCallback(async () => {
    if (!currentUser?.id || !sessionValid) {
      console.log("Cannot load chats: user or session invalid")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("Loading chats for user:", currentUser.id)
      
      const result = await getUserChats(currentUser.id)
      
      if (result.success && result.chats) {
        setChats(result.chats)
        console.log(`Loaded ${result.chats.length} chats`)
      } else {
        console.error('Failed to load chats:', result.error)
        setChats([])
      }
    } catch (error) {
      console.error('Error loading chats:', error)
      setChats([])
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, sessionValid])

  // Enhanced message loading with retry logic
  const loadMessages = useCallback(async (chatId: string) => {
    if (!currentUser?.id || !sessionValid) {
      console.log("Cannot load messages: user or session invalid")
      return
    }

    try {
      console.log(`Loading messages for chat: ${chatId}`)
      
      const result = await getEnhancedMessages(chatId)
      
      if (result.success && result.messages) {
        setMessages(prev => ({
          ...prev,
          [chatId]: result.messages || []
        }))

        // Set up realtime subscription with retry logic
        await setupRealtimeSubscription(chatId)

        // Mark messages as read
        await markMessagesAsRead(chatId, currentUser.id)
        
        console.log(`Loaded ${result.messages.length} messages for chat ${chatId}`)
      } else {
        console.error('Failed to load messages:', result.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }

    // Return cleanup function
    return () => {
      cleanupSubscription(chatId)
    }
  }, [currentUser?.id, sessionValid])

  // Enhanced realtime subscription with reconnection
  const setupRealtimeSubscription = useCallback(async (chatId: string) => {
    if (!sessionValid) {
      console.log("Session invalid, skipping subscription setup")
      return
    }

    // Clean up existing subscription
    if (activeSubscriptions[chatId]) {
      console.log(`Cleaning up existing subscription for chat: ${chatId}`)
      unsubscribeFromMessages(activeSubscriptions[chatId])
    }

    try {
      console.log(`Setting up realtime subscription for chat: ${chatId}`)
      
      const channel = subscribeToMessages(chatId, (newMessage) => {
        console.log(`📨 Received realtime message in chat ${chatId}:`, newMessage.id)
        
        setMessages(prev => {
          const existingMessages = prev[chatId] || []
          
          // Check if message already exists to prevent duplicates
          const messageExists = existingMessages.some(msg => msg.id === newMessage.id)
          if (messageExists) {
            console.log("Message already exists, skipping duplicate")
            return prev
          }
          
          return {
            ...prev,
            [chatId]: [...existingMessages, newMessage]
          }
        })

        // Reset retry counter on successful message
        reconnectAttemptsRef.current[chatId] = 0
      })

      // Monitor subscription status
      if (channel) {
        setActiveSubscriptions(prev => ({
          ...prev,
          [chatId]: channel
        }))
        
        console.log(`✅ Realtime subscription active for chat: ${chatId}`)
      }

    } catch (error) {
      console.error(`Failed to set up subscription for chat ${chatId}:`, error)
      
      // Retry logic
      const retryCount = reconnectAttemptsRef.current[chatId] || 0
      if (retryCount < 3) {
        reconnectAttemptsRef.current[chatId] = retryCount + 1
        
        console.log(`Retrying subscription setup (attempt ${retryCount + 1}/3)`)
        setTimeout(() => setupRealtimeSubscription(chatId), 2000 * (retryCount + 1))
      }
    }
  }, [sessionValid, activeSubscriptions])

  // Clean up subscription
  const cleanupSubscription = useCallback((chatId: string) => {
    const channel = activeSubscriptions[chatId]
    if (channel) {
      console.log(`Cleaning up subscription for chat: ${chatId}`)
      unsubscribeFromMessages(channel)
      
      setActiveSubscriptions(prev => {
        const newSubs = { ...prev }
        delete newSubs[chatId]
        return newSubs
      })
    }
  }, [activeSubscriptions])

  // Enhanced send message with retry
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    if (!currentUser?.id || !content.trim()) {
      console.log("Cannot send message: missing user or content")
      return
    }

    if (!sessionValid) {
      console.log("Cannot send message: session invalid")
      throw new Error("Session expired. Please refresh the page.")
    }

    try {
      console.log(`Sending message to chat: ${chatId}`)
      
      const result = await sendChatMessage(chatId, currentUser.id, content)
      
      if (result.success && result.message) {
        // Add message to local state for immediate UI feedback
        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), result.message!]
        }))
        
        console.log('Message sent successfully')
      } else {
        console.error('Failed to send message:', result.error)
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [currentUser?.id, sessionValid])

  // Create or get chat with validation
  const createOrGetChatWith = useCallback(async (otherUserId: string) => {
    if (!currentUser?.id || !sessionValid) {
      console.log("Cannot create chat: user or session invalid")
      return null
    }

    // Check if there's already a pending creation for this user
    if (pendingChatCreations.has(otherUserId)) {
      console.log('⏳ Chat creation already pending for user:', otherUserId)
      
      // Wait for pending creation to complete (max 10 seconds)
      let attempts = 0
      while (pendingChatCreations.has(otherUserId) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }
      
      // Check if chat was created during the wait
      const chatAfterWait = chats.find(chat => 
        chat.user1_id === otherUserId || chat.user2_id === otherUserId
      )
      if (chatAfterWait) {
        console.log('✅ Found chat created during wait:', chatAfterWait.id)
        return chatAfterWait
      }
    }

    // First check if we already have a chat with this user in local state
    const existingChat = chats.find(chat => 
      chat.user1_id === otherUserId || chat.user2_id === otherUserId
    )
    if (existingChat) {
      console.log('✅ Found existing chat in local state:', existingChat.id)
      return existingChat
    }

    // Mark as pending to prevent duplicate requests
    console.log('🔄 Starting chat creation with user:', otherUserId)
    setPendingChatCreations(prev => {
      const newSet = new Set(prev)
      newSet.add(otherUserId)
      return newSet
    })

    try {
      console.log(`Creating/getting chat with user: ${otherUserId}`)
      
      const result = await createOrGetChat(currentUser.id, otherUserId)
      
      if (result.success && result.chat) {
        console.log('✅ Chat API call successful:', result.chat.id)
        
        // Add chat to list with comprehensive duplicate checking
        setChats(prev => {
          // Multiple ways to check for existing chat
          const existsByID = prev.find(chat => chat.id === result.chat!.id)
          const existsByUsers1 = prev.find(chat => 
            (chat.user1_id === currentUser.id && chat.user2_id === otherUserId) ||
            (chat.user1_id === otherUserId && chat.user2_id === currentUser.id)
          )
          const existsByUsers2 = prev.find(chat => 
            chat.user1_id === otherUserId || chat.user2_id === otherUserId
          )

          if (existsByID || existsByUsers1 || existsByUsers2) {
            console.log('✅ Chat already exists in state, not adding duplicate')
            return prev
          }

          console.log('✅ Adding new chat to state:', result.chat!.id)
          return [result.chat!, ...prev]
        })
        
        console.log(`Chat created/retrieved: ${result.chat.id}`)
        return result.chat
      } else {
        console.error('❌ Failed to create/get chat:', result.error)
        if (result.error?.includes('406')) {
          console.error('❌ Supabase 406 error - likely RLS policy issue')
        }
        return null
      }
    } catch (error) {
      console.error('❌ Exception in createOrGetChatWith:', error)
      return null
    } finally {
      // Always remove from pending, even on error
      setPendingChatCreations(prev => {
        const newSet = new Set(prev)
        newSet.delete(otherUserId)
        return newSet
      })
    }
  }, [currentUser?.id, sessionValid, chats, pendingChatCreations])

  // Reconnect all subscriptions when session recovers
  const reconnectAllSubscriptions = useCallback(async () => {
    if (!sessionValid || !currentUser?.id) return

    console.log("Reconnecting all chat subscriptions...")
    
    // Clean up existing subscriptions
    Object.keys(activeSubscriptions).forEach(chatId => {
      cleanupSubscription(chatId)
    })

    // Reload chats and reconnect subscriptions for chats with messages
    await loadUserChats()
    
    // Reconnect to chats that have loaded messages
    Object.keys(messages).forEach(chatId => {
      if (messages[chatId].length > 0) {
        setupRealtimeSubscription(chatId)
      }
    })
  }, [sessionValid, currentUser?.id, activeSubscriptions, messages, loadUserChats, cleanupSubscription, setupRealtimeSubscription])

  // Handle user changes and session recovery
  useEffect(() => {
    if (!currentUser?.id) {
      // Clear state when user logs out
      setChats([])
      setMessages({})
      setLoading(false)
      lastUserIdRef.current = null
      
      // Clean up all subscriptions
      Object.values(activeSubscriptions).forEach(channel => {
        unsubscribeFromMessages(channel)
      })
      setActiveSubscriptions({})
      
      return
    }

    // Handle user change
    if (lastUserIdRef.current !== currentUser.id) {
      console.log("User changed, reloading chats...")
      lastUserIdRef.current = currentUser.id
      
      // Clean up previous user's subscriptions
      Object.values(activeSubscriptions).forEach(channel => {
        unsubscribeFromMessages(channel)
      })
      setActiveSubscriptions({})
      
      // Reset state and load new user's chats
      setChats([])
      setMessages({})
      reconnectAttemptsRef.current = {}
      
      loadUserChats()
      return
    }

    // Handle session recovery
    if (sessionValid && chats.length === 0 && !loading) {
      console.log("Session recovered, reloading chats...")
      loadUserChats()
    }
  }, [currentUser?.id, sessionValid, loadUserChats, chats.length, loading, activeSubscriptions])

  // Session recovery effect
  useEffect(() => {
    if (sessionValid && currentUser?.id && Object.keys(activeSubscriptions).length === 0) {
      // Session recovered but no active subscriptions
      const hasLoadedChats = Object.keys(messages).length > 0
      
      if (hasLoadedChats) {
        console.log("Session recovered, reconnecting subscriptions...")
        reconnectAllSubscriptions()
      }
    }
  }, [sessionValid, currentUser?.id, activeSubscriptions, messages, reconnectAllSubscriptions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current)
      }
      
      Object.values(activeSubscriptions).forEach(channel => {
        unsubscribeFromMessages(channel)
      })
    }
  }, [activeSubscriptions])

  // Connection health monitoring
  useEffect(() => {
    if (!sessionValid || !currentUser?.id) return

    const checkConnectionHealth = () => {
      const activeChats = Object.keys(messages).filter(chatId => messages[chatId].length > 0)
      const activeSubscriptionCount = Object.keys(activeSubscriptions).length
      
      if (activeChats.length > 0 && activeSubscriptionCount === 0) {
        console.log("Detected missing subscriptions, attempting recovery...")
        reconnectAllSubscriptions()
      }
    }

    // Check connection health every 30 seconds
    const healthCheck = setInterval(checkConnectionHealth, 30000)
    
    return () => clearInterval(healthCheck)
  }, [sessionValid, currentUser?.id, messages, activeSubscriptions, reconnectAllSubscriptions])

  return {
    chats,
    messages,
    loading,
    loadMessages,
    sendMessage,
    createOrGetChatWith,
    refreshChats: loadUserChats,
    reconnectSubscriptions: reconnectAllSubscriptions,
    connectionHealth: {
      activeSubscriptions: Object.keys(activeSubscriptions).length,
      totalChats: chats.length,
      sessionValid
    }
  }
}