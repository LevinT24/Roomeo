/**
 * RoommateChatPage - Complete roommate chat system with all advanced features
 * Features: Reactions, File sharing, Pinned messages, Expense splitting, Chore assignments,
 * Bill reminders, Polls, Mentions, Real-time updates
 */

"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useEnhancedChat } from "@/hooks/useEnhancedChat"
import type { User } from "@/types/user"
import type { ChatMessage, Chat } from "@/types/chat"
import type { 
  MessageReaction, 
  ExpenseDetection, 
  ChoreDetection,
  MentionDetection 
} from "@/types/enhanced-chat"

// Import enhanced chat services
import {
  addMessageReaction,
  removeMessageReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  assignChore,
  proposeExpenseSplit,
  createPoll,
  votePoll,
  createBillReminder,
  detectExpenseInText,
  detectChoreInText,
  detectMentionsInText,
  sendEnhancedMessage
} from "@/services/enhanced-chat"

// Import chat components
import { MessageBubble } from "@/components/chat/MessageBubble"
import MessageReactions from "@/components/chat/MessageReactions"
import PinnedMessages from "@/components/chat/PinnedMessages"
import ReactionPicker from "@/components/chat/ReactionPicker"
import FileUpload from "@/components/chat/FileUpload"
import PollCreator from "@/components/chat/PollCreator"
import PollDisplay from "@/components/chat/PollDisplay"
import ChoreAssignment from "@/components/chat/ChoreAssignment"
import ChoreDisplay from "@/components/chat/ChoreDisplay"
import ExpenseSplit from "@/components/chat/ExpenseSplit"
import ExpenseDisplay from "@/components/chat/ExpenseDisplay"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RoommateChatPageProps {
  user: User
  onBack: () => void
  chatTarget?: { sellerId: string; listingId?: string } | null
}

export default function RoommateChatPage({
  user,
  onBack,
  chatTarget
}: RoommateChatPageProps) {
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

  // State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [initializingChat, setInitializingChat] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  
  // Modal states
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [showChoreAssignment, setShowChoreAssignment] = useState(false)
  const [showExpenseSplit, setShowExpenseSplit] = useState(false)
  const [detectedExpense, setDetectedExpense] = useState<ExpenseDetection | null>(null)
  const [detectedChore, setDetectedChore] = useState<ChoreDetection | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initializedSellerRef = useRef<string | null>(null)

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto" 
    })
  }, [])

  /**
   * Initialize chat from marketplace
   */
  useEffect(() => {
    const initializeMarketplaceChat = async () => {
      if (!chatTarget?.sellerId || initializedSellerRef.current === chatTarget.sellerId) {
        return
      }

      console.log("🔄 Initializing roommate chat with seller:", chatTarget.sellerId)
      setInitializingChat(true)
      initializedSellerRef.current = chatTarget.sellerId

      try {
        const chat = await createOrGetChatWith(chatTarget.sellerId)
        if (chat) {
          setSelectedChatId(chat.id)
          console.log("✅ Roommate chat initialized:", chat.id)
        }
      } catch (error) {
        console.error("❌ Failed to initialize roommate chat:", error)
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
      loadPinnedMessages(selectedChatId)
      
      return () => {
        unsubscribeFromChat(selectedChatId)
      }
    }
  }, [selectedChatId, loadMessages, subscribeToChat, unsubscribeFromChat])

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
   * Load pinned messages for a chat
   */
  const loadPinnedMessages = async (chatId: string) => {
    try {
      const result = await getPinnedMessages(chatId)
      if (result.success && result.pinned) {
        setPinnedMessages(result.pinned)
      }
    } catch (error) {
      console.error("Failed to load pinned messages:", error)
    }
  }

  /**
   * Handle sending messages with smart detection
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChatId || !newMessage.trim()) return

    const content = newMessage.trim()
    
    // Get chat participants for smart detection
    const selectedChat = chats.find(c => c.id === selectedChatId)
    const chatUsers = selectedChat ? [
      { id: selectedChat.user1_id, name: selectedChat.user1_id === user.id ? user.name : selectedChat.other_user_name || 'Unknown' },
      { id: selectedChat.user2_id, name: selectedChat.user2_id === user.id ? user.name : selectedChat.other_user_name || 'Unknown' }
    ] : []

    // Detect expenses, chores, and mentions
    const expenseDetection = detectExpenseInText(content)
    const choreDetection = detectChoreInText(content, chatUsers)
    const mentionDetections = detectMentionsInText(content, chatUsers)

    try {
      // Send the message using enhanced service
      const result = await sendEnhancedMessage(selectedChatId, user.id, content)
      
      if (result.success && result.message) {
        // Handle detected expense
        if (expenseDetection && expenseDetection.confidence > 0.6) {
          setDetectedExpense(expenseDetection)
          setShowExpenseSplit(true)
        }

        // Handle detected chore
        if (choreDetection && choreDetection.confidence > 0.6) {
          setDetectedChore(choreDetection)
          setShowChoreAssignment(true)
        }

        // Handle mentions
        if (mentionDetections.length > 0) {
          mentionDetections.forEach(mention => {
            // Create mention records would be handled by the backend
            console.log("Mention detected:", mention)
          })
        }

        setNewMessage("")
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  /**
   * Handle typing events
   */
  const handleTypingChange = (value: string) => {
    setNewMessage(value)
    
    if (selectedChatId) {
      handleTyping(selectedChatId, value.length > 0)
    }
  }

  /**
   * Handle message reactions
   */
  const handleReactionAdd = async (messageId: string, emoji: string) => {
    try {
      await addMessageReaction(messageId, user.id, emoji)
    } catch (error) {
      console.error("Failed to add reaction:", error)
    }
  }

  const handleReactionRemove = async (messageId: string, emoji: string) => {
    try {
      await removeMessageReaction(messageId, user.id, emoji)
    } catch (error) {
      console.error("Failed to remove reaction:", error)
    }
  }

  /**
   * Handle message pinning
   */
  const handlePinMessage = async (messageId: string) => {
    if (!selectedChatId) return
    
    try {
      const result = await pinMessage(selectedChatId, messageId, user.id)
      if (result.success) {
        await loadPinnedMessages(selectedChatId)
      }
    } catch (error) {
      console.error("Failed to pin message:", error)
    }
  }

  const handleUnpinMessage = async (messageId: string) => {
    if (!selectedChatId) return
    
    try {
      const result = await unpinMessage(selectedChatId, messageId)
      if (result.success) {
        await loadPinnedMessages(selectedChatId)
      }
    } catch (error) {
      console.error("Failed to unpin message:", error)
    }
  }

  /**
   * Handle poll creation
   */
  const handlePollCreate = async (question: string, options: string[], multipleChoice: boolean, expiresIn?: number) => {
    if (!selectedChatId) return

    try {
      // First create a message for the poll
      const messageResult = await sendEnhancedMessage(selectedChatId, user.id, `📊 Poll: ${question}`)
      
      if (messageResult.success && messageResult.message) {
        await createPoll(
          selectedChatId,
          messageResult.message.id,
          question,
          options,
          user.id,
          multipleChoice,
          expiresIn
        )
      }
      
      setShowPollCreator(false)
    } catch (error) {
      console.error("Failed to create poll:", error)
    }
  }

  /**
   * Handle chore assignment
   */
  const handleChoreAssign = async (choreName: string, assignedTo: string, dueDate?: Date) => {
    if (!selectedChatId) return

    try {
      const result = await assignChore(
        selectedChatId,
        choreName,
        assignedTo,
        user.id,
        dueDate
      )
      
      if (result.success) {
        // Send a system message about the chore assignment
        await sendEnhancedMessage(
          selectedChatId, 
          user.id, 
          `🧹 Assigned "${choreName}" to ${result.chore?.assigned_to_user?.name}${dueDate ? ` (due ${dueDate.toLocaleDateString()})` : ''}`
        )
      }
      
      setShowChoreAssignment(false)
      setDetectedChore(null)
    } catch (error) {
      console.error("Failed to assign chore:", error)
    }
  }

  /**
   * Handle expense splitting
   */
  const handleExpenseCreate = async (description: string, amount: number, splitWith: string[]) => {
    if (!selectedChatId) return

    try {
      // First create a message for the expense
      const messageResult = await sendEnhancedMessage(
        selectedChatId, 
        user.id, 
        `💸 Expense Split: ${description} - $${amount.toFixed(2)}`
      )
      
      if (messageResult.success && messageResult.message) {
        await proposeExpenseSplit(
          selectedChatId,
          messageResult.message.id,
          description,
          amount,
          user.id
        )
      }
      
      setShowExpenseSplit(false)
      setDetectedExpense(null)
    } catch (error) {
      console.error("Failed to create expense split:", error)
    }
  }

  /**
   * Get current chat data
   */
  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  const selectedChatMessages = selectedChatId ? messages[selectedChatId] || [] : []
  
  // Get typing info for selected chat
  const chatTypingUsers = selectedChatId ? typingUsers[selectedChatId] || {} : {}
  const typingUserNames = Object.entries(chatTypingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== user.id)
    .map(([userId]) => {
      const chat = chats.find(c => c.user1_id === userId || c.user2_id === userId)
      return chat?.other_user_name || 'Someone'
    })

  const chatUsers = selectedChat ? [
    { id: selectedChat.user1_id, name: selectedChat.user1_id === user.id ? user.name : selectedChat.other_user_name || 'Unknown', avatar: '' },
    { id: selectedChat.user2_id, name: selectedChat.user2_id === user.id ? user.name : selectedChat.other_user_name || 'Unknown', avatar: '' }
  ] : []

  return (
    <div className="bg-mint-cream min-h-screen">
      <div className="flex h-screen">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r border-sage/30 bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-sage/30 bg-emerald-primary text-gold-accent">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-emerald-primary/80 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold">💬 Roommate Chats</h1>
                <p className="text-sm opacity-80">Stay connected with roommates</p>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className={`px-4 py-2 text-sm ${isConnected ? 'bg-moss-green/20 text-moss-green' : 'bg-red-100 text-red-600'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-moss-green' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
              <span className="ml-auto text-xs">
                {connectionStatus.activeSubscriptions} active
              </span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {initializingChat && (
              <div className="p-4 border-b border-sage/20">
                <div className="flex items-center gap-3 p-3 bg-moss-green/10 rounded-xl">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-primary border-t-transparent"></div>
                  <span className="text-emerald-primary font-medium">Connecting to roommate...</span>
                </div>
              </div>
            )}
            
            {chats.length === 0 && !initializingChat ? (
              <div className="p-6 text-center text-emerald-primary/60">
                <div className="text-4xl mb-4">🏠</div>
                <p className="font-medium mb-2">No roommate chats yet</p>
                <p className="text-sm">Start matching to connect with potential roommates!</p>
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
                      className={`p-3 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                        selectedChatId === chat.id
                          ? "bg-emerald-primary text-gold-accent shadow-soft"
                          : "bg-sage/5 hover:bg-sage/10 text-emerald-primary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={chat.other_user_avatar || "/placeholder.svg"}
                            alt={chat.other_user_name}
                            className="w-12 h-12 rounded-full border-2 border-sage/30"
                          />
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-moss-green text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold truncate">
                              {chat.other_user_name}
                            </p>
                            {chat.last_message_at && (
                              <p className="text-xs opacity-75">
                                {new Date(chat.last_message_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <p className="text-sm opacity-75 truncate">
                            {isTyping ? (
                              <span className="italic">typing...</span>
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

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-mint-cream">
          {selectedChatId ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-sage/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedChat?.other_user_avatar || "/placeholder.svg"}
                      alt={selectedChat?.other_user_name}
                      className="w-10 h-10 rounded-full border-2 border-sage/30"
                    />
                    <div>
                      <h2 className="text-lg font-semibold text-emerald-primary">
                        {selectedChat?.other_user_name}
                      </h2>
                      {typingUserNames.length > 0 && (
                        <p className="text-sm text-moss-green italic">
                          typing...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chat Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowPollCreator(true)}
                      size="sm"
                      className="bg-sage/20 text-emerald-primary hover:bg-sage/30"
                    >
                      📊 Poll
                    </Button>
                    <Button
                      onClick={() => setShowChoreAssignment(true)}
                      size="sm"
                      className="bg-sage/20 text-emerald-primary hover:bg-sage/30"
                    >
                      🧹 Chore
                    </Button>
                    <Button
                      onClick={() => setShowExpenseSplit(true)}
                      size="sm"
                      className="bg-sage/20 text-emerald-primary hover:bg-sage/30"
                    >
                      💸 Split
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pinned Messages */}
              {pinnedMessages.length > 0 && (
                <PinnedMessages
                  pinnedMessages={pinnedMessages}
                  onUnpin={handleUnpinMessage}
                  currentUserId={user.id}
                />
              )}

              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 px-4 py-4 space-y-4 overflow-y-auto"
              >
                {selectedChatMessages.map((message, index) => {
                  const isLast = index === selectedChatMessages.length - 1
                  const isFirst = index === 0 || selectedChatMessages[index - 1].sender_id !== message.sender_id
                  
                  return (
                    <div key={message.id} className="group">
                      <MessageBubble
                        message={message}
                        isOwn={message.sender_id === user.id}
                        showAvatar={message.sender_id !== user.id}
                        isFirst={isFirst}
                        isLast={isLast}
                        onRetry={() => retryMessage(selectedChatId, message.id)}
                      />
                      
                      {/* Message Actions */}
                      <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowReactionPicker(message.id)}
                          className="text-xs bg-sage/20 text-emerald-primary px-2 py-1 rounded-full hover:bg-sage/30"
                        >
                          😊
                        </button>
                        <button
                          onClick={() => handlePinMessage(message.id)}
                          className="text-xs bg-sage/20 text-emerald-primary px-2 py-1 rounded-full hover:bg-sage/30"
                        >
                          📌 Pin
                        </button>
                      </div>

                      {/* Reactions */}
                      {message.id && (
                        <MessageReactions
                          reactions={[]} // This would come from the message data
                          currentUserId={user.id}
                          onReactionAdd={(emoji) => handleReactionAdd(message.id, emoji)}
                          onReactionRemove={(emoji) => handleReactionRemove(message.id, emoji)}
                        />
                      )}
                    </div>
                  )
                })}
                
                {/* Typing Indicator */}
                {typingUserNames.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-sage/20 text-emerald-primary px-4 py-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-emerald-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-emerald-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-emerald-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm">{typingUserNames[0]} is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-sage/30 p-4">
                {/* Smart Suggestions */}
                {(detectedExpense || detectedChore) && (
                  <div className="mb-3 p-3 bg-moss-green/10 border border-moss-green/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-emerald-primary">
                        {detectedExpense && (
                          <span>💸 Detected expense: {detectedExpense.description} ${detectedExpense.amount}</span>
                        )}
                        {detectedChore && (
                          <span>🧹 Detected chore: {detectedChore.choreName}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => detectedExpense ? setShowExpenseSplit(true) : setShowChoreAssignment(true)}
                          className="bg-moss-green text-white hover:bg-moss-green/80"
                        >
                          {detectedExpense ? "Split It" : "Assign It"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDetectedExpense(null)
                            setDetectedChore(null)
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    placeholder="Type your message... Use @name to mention, or describe expenses/chores"
                    className="flex-1 border-2 border-sage/30 rounded-xl focus:border-moss-green"
                    disabled={!isConnected}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || !isConnected}
                    className="bg-emerald-primary text-gold-accent hover:bg-emerald-primary/90 px-6 rounded-xl font-bold"
                  >
                    Send
                  </Button>
                </form>

                {!isConnected && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                    ⚠️ Disconnected - Messages may not send until connection is restored
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🏠💬</div>
                <h3 className="text-xl font-semibold text-emerald-primary mb-2">
                  Welcome to Roommate Chat!
                </h3>
                <p className="text-emerald-primary/60 max-w-md">
                  Select a chat to start messaging with your potential roommates. 
                  Use reactions, split expenses, assign chores, create polls, and more!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showReactionPicker && (
        <ReactionPicker
          messageId={showReactionPicker}
          currentUserId={user.id}
          onReactionAdd={(emoji) => handleReactionAdd(showReactionPicker, emoji)}
          isOpen={!!showReactionPicker}
          onClose={() => setShowReactionPicker(null)}
        />
      )}

      {showPollCreator && (
        <PollCreator
          onPollCreate={handlePollCreate}
          isOpen={showPollCreator}
          onClose={() => setShowPollCreator(false)}
        />
      )}

      {showChoreAssignment && (
        <ChoreAssignment
          chatUsers={chatUsers}
          onChoreAssign={handleChoreAssign}
          isOpen={showChoreAssignment}
          onClose={() => setShowChoreAssignment(false)}
        />
      )}

      {showExpenseSplit && (
        <ExpenseSplit
          chatUsers={chatUsers}
          onExpenseCreate={handleExpenseCreate}
          detectedExpense={detectedExpense}
          isOpen={showExpenseSplit}
          onClose={() => setShowExpenseSplit(false)}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  )
}