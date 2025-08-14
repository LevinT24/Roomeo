/**
 * Enhanced ChatPage - Professional real-time messaging interface
 * Features: Real-time messaging, typing indicators, optimistic updates, image sharing
 */

"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useEnhancedChat } from "@/hooks/useEnhancedChat"
import { uploadChatImage } from "@/services/chatMedia"
import type { User } from "@/types/user"
import type { ChatMessage, Chat } from "@/types/chat"
import { ChatInput } from "@/components/chat/ChatInput"
import { MessageBubble } from "@/components/chat/MessageBubble"

interface EnhancedChatPageProps {
  user: User
  onBack: () => void
  chatTarget?: { sellerId: string; listingId?: string } | null
}

export default function EnhancedChatPage({ 
  user, 
  onBack, 
  chatTarget 
}: EnhancedChatPageProps) {
  const {
    chats,
    messages,
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
    getUnreadCount,
    getChatMetadata
  } = useEnhancedChat(user)

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [initializingChat, setInitializingChat] = useState(false)
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const initializedSellerRef = useRef<string | null>(null)

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto" 
    })
  }, [])

  /**
   * Auto-scroll when new messages arrive
   */
  useEffect(() => {
    if (selectedChatId && messages[selectedChatId]) {
      const container = messagesContainerRef.current
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
        if (isNearBottom) {
          scrollToBottom()
        }
      }
    }
  }, [messages, selectedChatId, scrollToBottom])

  /**
   * Initialize chat when coming from marketplace
   */
  useEffect(() => {
    const initializeMarketplaceChat = async () => {
      if (!chatTarget?.sellerId || initializedSellerRef.current === chatTarget.sellerId) {
        return
      }

      console.log("🔄 Initializing chat with seller:", chatTarget.sellerId)
      setInitializingChat(true)
      initializedSellerRef.current = chatTarget.sellerId

      try {
        const chat = await createOrGetChatWith(chatTarget.sellerId)
        if (chat) {
          setSelectedChatId(chat.id)
          console.log("✅ Chat initialized:", chat.id)
        }
      } catch (error) {
        console.error("❌ Failed to initialize chat:", error)
      } finally {
        setInitializingChat(false)
      }
    }

    initializeMarketplaceChat()
  }, [chatTarget?.sellerId, createOrGetChatWith])

  /**
   * Load messages and subscribe when chat is selected
   */
  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId)
      subscribeToChat(selectedChatId)
      
      return () => {
        unsubscribeFromChat(selectedChatId)
      }
    }
  }, [selectedChatId, loadMessages, subscribeToChat, unsubscribeFromChat])

  /**
   * Mark messages as read when chat is active
   */
  useEffect(() => {
    if (selectedChatId && messages[selectedChatId]) {
      const chatMessages = messages[selectedChatId]
      const unreadMessages = chatMessages.filter(msg => 
        msg.sender_id !== user.id && !msg.is_read
      )
      
      if (unreadMessages.length > 0) {
        markRead(selectedChatId)
      }
    }
  }, [selectedChatId, messages, user.id, markRead])

  /**
   * Handle sending messages
   */
  const handleSendMessage = async (
    content: string, 
    type: 'text' | 'image' = 'text',
    imageUrl?: string
  ) => {
    if (!selectedChatId) return
    
    try {
      await sendMessage(selectedChatId, content, type, imageUrl)
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  /**
   * Handle image upload
   */
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const result = await uploadChatImage(file, user.id)
      
      if (result.success && result.publicUrl) {
        return result.publicUrl
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error("Image upload failed:", error)
      throw error
    }
  }

  /**
   * Handle typing events
   */
  const handleTypingEvent = (isTyping: boolean) => {
    if (selectedChatId) {
      handleTyping(selectedChatId, isTyping)
    }
  }

  /**
   * Handle message retry
   */
  const handleRetryMessage = (messageId: string) => {
    if (selectedChatId) {
      retryMessage(selectedChatId, messageId)
    }
  }

  /**
   * Group messages for better display
   */
  const groupMessages = (messages: ChatMessage[]) => {
    const groups: ChatMessage[][] = []
    let currentGroup: ChatMessage[] = []
    let lastSenderId: string | null = null
    let lastMessageTime: number = 0

    messages.forEach((message) => {
      const messageTime = new Date(message.created_at).getTime()
      const timeDiff = messageTime - lastMessageTime
      const fiveMinutes = 5 * 60 * 1000

      if (
        message.sender_id !== lastSenderId ||
        timeDiff > fiveMinutes ||
        currentGroup.length >= 10
      ) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [message]
      } else {
        currentGroup.push(message)
      }

      lastSenderId = message.sender_id
      lastMessageTime = messageTime
    })

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  const selectedChatMessages = selectedChatId ? messages[selectedChatId] || [] : []
  const messageGroups = groupMessages(selectedChatMessages)
  
  // Get typing info for selected chat
  const chatTypingUsers = selectedChatId ? typingUsers[selectedChatId] || {} : {}
  const typingUserNames = Object.entries(chatTypingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== user.id)
    .map(([userId]) => {
      const chat = chats.find(c => c.user1_id === userId || c.user2_id === userId)
      return chat?.other_user_name || 'Someone'
    })

  return (
    <div className="bg-white text-black h-screen flex flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <header 
        className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm flex-shrink-0"
        style={{
          position: 'relative',
          zIndex: 30,
          backgroundColor: 'white'
        }}
      >
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3 flex-1">
          {selectedChat && (
            <>
              <img
                src={selectedChat.other_user_avatar || "/placeholder.svg"}
                alt={selectedChat.other_user_name}
                className="w-10 h-10 rounded-full border border-gray-200"
              />
              <div className="flex-1">
                <h1 className="font-semibold text-lg">
                  {selectedChat.other_user_name}
                </h1>
                {typingUserNames.length > 0 && (
                  <p className="text-sm text-blue-500">
                    {typingUserNames.length === 1 ? 'typing...' : 'typing...'}
                  </p>
                )}
              </div>
            </>
          )}
          
          {initializingChat && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Connecting...</span>
            </div>
          )}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {connectionStatus.activeSubscriptions} active
          </span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Chat List */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                Loading chats...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start matching to begin chatting!</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {chats.map((chat) => {
                  const unreadCount = getUnreadCount(chat.id)
                  const { isTyping } = getChatMetadata(chat.id)
                  
                  return (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedChatId === chat.id
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-white border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={chat.other_user_avatar || "/placeholder.svg"}
                            alt={chat.other_user_name}
                            className="w-12 h-12 rounded-full border border-gray-200"
                          />
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">
                              {chat.other_user_name}
                            </p>
                            {chat.last_message_at && (
                              <p className="text-xs text-gray-500">
                                {new Date(chat.last_message_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {isTyping ? (
                              <span className="text-blue-500 italic">typing...</span>
                            ) : (
                              chat.last_message_preview || chat.last_message || "No messages yet"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {selectedChatId ? (
            <>
              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 px-4 py-4 space-y-4 overflow-y-auto"
                style={{ 
                  paddingBottom: '120px', // Space for input area
                  paddingRight: '20px', // Extra right padding to prevent cutoff
                  height: 'calc(100vh - 180px)' // Full height minus header and input
                }}
              >
                {messageGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-1">
                    {group.map((message, messageIndex) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.sender_id === user.id}
                        showAvatar={message.sender_id !== user.id}
                        isFirst={messageIndex === 0}
                        isLast={messageIndex === group.length - 1}
                        onRetry={() => handleRetryMessage(message.id)}
                        onImageClick={setImageModalUrl}
                      />
                    ))}
                  </div>
                ))}
                
                {/* Simple Typing Indicator */}
                {typingUserNames.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600 italic">
                        {typingUserNames[0]} is typing...
                      </p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div 
                className="border-t-2 border-[#004D40] bg-[#F2F5F1] p-3 flex-shrink-0" 
                style={{ 
                  position: 'absolute', 
                  bottom: '80px', // Above the bottom nav
                  left: 0,
                  right: 0,
                  zIndex: 40,
                  backgroundColor: '#F2F5F1'
                }}
              >
                <div className="flex gap-2 items-center">
                  {/* Message Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="w-full px-3 py-2 border-2 border-[#004D40] rounded-lg bg-white text-[#004D40] font-bold placeholder:text-[#004D40]/60 focus:outline-none focus:border-[#44C76F] shadow-[2px_2px_0px_0px_#004D40] focus:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                      disabled={!isConnected}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement
                          if (input.value.trim()) {
                            handleSendMessage(input.value)
                            input.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                  
                  {/* Send Button */}
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="Type your message"]') as HTMLInputElement
                      if (input?.value.trim()) {
                        handleSendMessage(input.value)
                        input.value = ''
                      }
                    }}
                    disabled={!isConnected}
                    className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black px-4 py-2 border-2 border-[#004D40] rounded-lg shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    SEND
                  </button>
                </div>
                
                {/* Connection Status */}
                {!isConnected && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-500 rounded text-red-700 font-bold text-xs">
                    ⚠️ DISCONNECTED
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a chat from the sidebar to start messaging</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Image Modal */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-4xl p-4">
            <img
              src={imageModalUrl}
              alt="Full size image"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-40">
          {error}
        </div>
      )}
    </div>
  )
}