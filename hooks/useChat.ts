"use client"

import { useState, useEffect, useCallback } from "react"
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { User } from "@/types/user"
import { 
  getUserChats, 
  getChatMessages, 
  sendMessage as sendChatMessage, 
  createOrGetChat,
  subscribeToMessages,
  unsubscribeFromMessages,
  markMessagesAsRead,
  type Chat,
  type ChatMessage
} from "@/services/chat"

export function useChat(currentUser: User | null) {
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<{ [chatId: string]: ChatMessage[] }>({})
  const [loading, setLoading] = useState(true)
  const [activeSubscriptions, setActiveSubscriptions] = useState<{ [chatId: string]: RealtimeChannel }>({})

  // Load user chats on mount
  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }

    loadUserChats()
  }, [currentUser?.id])

  const loadUserChats = async () => {
    if (!currentUser?.id) return

    try {
      setLoading(true)
      const result = await getUserChats(currentUser.id)
      
      if (result.success && result.chats) {
        setChats(result.chats)
      } else {
        console.error('Failed to load chats:', result.error)
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const result = await getChatMessages(chatId)
      
      if (result.success && result.messages) {
        setMessages(prev => ({
          ...prev,
          [chatId]: result.messages || []
        }))

        // Subscribe to real-time messages for this chat
        if (!activeSubscriptions[chatId]) {
          console.log(`🔔 Creating subscription for chat: ${chatId}`)
          const channel = subscribeToMessages(chatId, (newMessage) => {
            console.log(`📨 Received new message in chat ${chatId}:`, newMessage)
            setMessages(prev => {
              const existingMessages = prev[chatId] || []
              // Check if message already exists to prevent duplicates
              const messageExists = existingMessages.some(msg => msg.id === newMessage.id)
              if (messageExists) return prev
              
              return {
                ...prev,
                [chatId]: [...existingMessages, newMessage]
              }
            })
          })

          setActiveSubscriptions(prev => ({
            ...prev,
            [chatId]: channel
          }))
        }

        // Mark messages as read
        if (currentUser?.id) {
          await markMessagesAsRead(chatId, currentUser.id)
        }
      } else {
        console.error('Failed to load messages:', result.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }

    // Return cleanup function
    return () => {
      const channel = activeSubscriptions[chatId]
      if (channel) {
        unsubscribeFromMessages(channel)
        setActiveSubscriptions(prev => {
          const newSubs = { ...prev }
          delete newSubs[chatId]
          return newSubs
        })
      }
    }
  }, [activeSubscriptions, currentUser?.id])

  // Send a message
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    if (!currentUser?.id || !content.trim()) return

    try {
      const result = await sendChatMessage(chatId, currentUser.id, content)
      
      if (result.success && result.message) {
        // Add message to local state immediately for better UX
        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), result.message!]
        }))
        console.log('Message sent successfully')
      } else {
        console.error('Failed to send message:', result.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [currentUser?.id])

  // Create or get chat between current user and another user
  const createOrGetChatWith = useCallback(async (otherUserId: string) => {
    if (!currentUser?.id) return null

    try {
      const result = await createOrGetChat(currentUser.id, otherUserId)
      
      if (result.success && result.chat) {
        // Add chat to list if it doesn't exist
        setChats(prev => {
          const exists = prev.find(chat => chat.id === result.chat!.id)
          if (exists) return prev
          return [result.chat!, ...prev]
        })
        
        return result.chat
      } else {
        console.error('Failed to create/get chat:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error creating/getting chat:', error)
      return null
    }
  }, [currentUser?.id])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.values(activeSubscriptions).forEach(channel => {
        unsubscribeFromMessages(channel)
      })
    }
  }, [activeSubscriptions])

  return {
    chats,
    messages,
    loading,
    loadMessages,
    sendMessage,
    createOrGetChatWith,
    refreshChats: loadUserChats
  }
}