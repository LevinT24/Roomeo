"use client"

import { useState, useEffect } from "react"
import type { Chat, ChatMessage } from "@/types/chat"
import type { User } from "@/types/user"

export function useChat(currentUser: User | null) {
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<{ [chatId: string]: ChatMessage[] }>({})
  const [loading, setLoading] = useState(true)

  // Mock data
  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    // Mock chats
    const mockChats: Chat[] = [
      {
        id: "chat-1",
        participants: [currentUser.id, "user-2"],
        participantNames: {
          [currentUser.id]: currentUser.name,
          "user-2": "Sophia Clark",
        },
        participantAvatars: {
          [currentUser.id]: currentUser.profilePicture || "/placeholder.svg?height=40&width=40&text=User",
          "user-2": "/placeholder.svg?height=40&width=40&text=Sophia",
        },
        lastMessage: "Hey! Are you still looking for a roommate?",
        lastMessageTime: new Date(),
        lastMessageSender: "user-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "chat-2",
        participants: [currentUser.id, "user-3"],
        participantNames: {
          [currentUser.id]: currentUser.name,
          "user-3": "Marcus Johnson",
        },
        participantAvatars: {
          [currentUser.id]: currentUser.profilePicture || "/placeholder.svg?height=40&width=40&text=User",
          "user-3": "/placeholder.svg?height=40&width=40&text=Marcus",
        },
        lastMessage: "That sounds great! When can we meet?",
        lastMessageTime: new Date(Date.now() - 3600000), // 1 hour ago
        lastMessageSender: currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    setChats(mockChats)
    setLoading(false)
  }, [currentUser])

  const loadMessages = (chatId: string) => {
    // Mock messages
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-1",
        chatId,
        senderId: "user-2",
        senderName: "Sophia Clark",
        senderAvatar: "/placeholder.svg?height=40&width=40&text=Sophia",
        message: "Hey! Are you still looking for a roommate?",
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        read: true,
      },
      {
        id: "msg-2",
        chatId,
        senderId: currentUser?.id || "",
        senderName: currentUser?.name || "",
        senderAvatar: currentUser?.profilePicture || "/placeholder.svg?height=40&width=40&text=User",
        message: "Yes! I'm definitely interested. Tell me more about the place.",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: true,
      },
      {
        id: "msg-3",
        chatId,
        senderId: "user-2",
        senderName: "Sophia Clark",
        senderAvatar: "/placeholder.svg?height=40&width=40&text=Sophia",
        message: "It's a 2BR apartment in downtown. Rent is $1200/month split between us. Very clean and modern!",
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        read: true,
      },
    ]

    setMessages((prev) => ({
      ...prev,
      [chatId]: mockMessages,
    }))

    // Return a mock unsubscribe function
    return () => {}
  }

  const sendMessage = async (chatId: string, message: string) => {
    if (!currentUser || !message.trim()) return

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.profilePicture || "/placeholder.svg?height=40&width=40&text=User",
      message: message.trim(),
      timestamp: new Date(),
      read: false,
    }

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMessage],
    }))

    // Update chat's last message
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: message.trim(),
              lastMessageTime: new Date(),
              lastMessageSender: currentUser.id,
              updatedAt: new Date(),
            }
          : chat,
      ),
    )
  }

  const createOrGetChat = async (otherUser: User): Promise<string | null> => {
    // Mock chat creation
    return "chat-1"
  }

  return {
    chats,
    messages,
    loading,
    loadMessages,
    sendMessage,
    createOrGetChat,
  }
}