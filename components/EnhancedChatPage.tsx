"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/useAuth"
import type { User } from "@/types/user"
import type { 
  EnhancedChatMessage, 
  EnhancedChat, 
  MessageReaction,
  PinnedMessage,
  ChatPoll,
  ChoreAssignment,
  ChatExpenseSplit,
  ExpenseDetection 
} from "@/types/enhanced-chat"

// Import all chat components
import MessageReactions from "./chat/MessageReactions"
import ReactionPicker from "./chat/ReactionPicker"
import PinnedMessages from "./chat/PinnedMessages"
import PollDisplay from "./chat/PollDisplay"
import PollCreator from "./chat/PollCreator"
import ChoreDisplay from "./chat/ChoreDisplay"
import ChoreAssignmentModal from "./chat/ChoreAssignment"
import ExpenseDisplay from "./chat/ExpenseDisplay"
import ExpenseSplit from "./chat/ExpenseSplit"
import EnhancedMessageInput from "./chat/EnhancedMessageInput"
import FileUpload from "./chat/FileUpload"

// Import services
import {
  getEnhancedMessages,
  sendEnhancedMessage,
  addMessageReaction,
  removeMessageReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  createPoll,
  votePoll,
  assignChore,
  completeChore,
  proposeExpenseSplit,
  detectExpenseInText,
  detectChoreInText,
  detectMentionsInText,
  uploadMessageFile,
  subscribeToEnhancedChat
} from "@/services/enhanced-chat"

interface EnhancedChatPageProps {
  user: User
  chat: EnhancedChat
  onBack: () => void
}

export default function EnhancedChatPage({ user, chat, onBack }: EnhancedChatPageProps) {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(null)
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false)
  const [choreAssignmentOpen, setChoreAssignmentOpen] = useState(false)
  const [expenseSplitOpen, setExpenseSplitOpen] = useState(false)
  const [detectedExpense, setDetectedExpense] = useState<ExpenseDetection | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatUsers = [
    { id: chat.user1_id, name: chat.user1_id === user.id ? user.name : chat.other_user_name || 'Roommate' },
    { id: chat.user2_id, name: chat.user2_id === user.id ? user.name : chat.other_user_name || 'Roommate' }
  ].filter(u => u.id !== user.id) // Remove current user from list

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load initial data
  useEffect(() => {
    loadChatData()
  }, [chat.id])

  // Real-time subscriptions
  useEffect(() => {
    const channel = subscribeToEnhancedChat(
      chat.id,
      (message) => {
        setMessages(prev => [...prev, message])
      },
      (reaction) => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === reaction.message_id 
              ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
              : msg
          )
        )
      },
      (poll) => {
        // Handle poll updates
        setMessages(prev => 
          prev.map(msg => 
            msg.id === poll.message_id 
              ? { ...msg, poll }
              : msg
          )
        )
      },
      (chore) => {
        // Handle chore updates
        setMessages(prev => 
          prev.map(msg => 
            msg.id === chore.message_id 
              ? { ...msg, chore_assignment: chore }
              : msg
          )
        )
      }
    )

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [chat.id])

  const loadChatData = async () => {
    setLoading(true)
    try {
      const [messagesResult, pinnedResult] = await Promise.all([
        getEnhancedMessages(chat.id),
        getPinnedMessages(chat.id)
      ])

      if (messagesResult.success && messagesResult.messages) {
        setMessages(messagesResult.messages)
      }

      if (pinnedResult.success && pinnedResult.pinned) {
        setPinnedMessages(pinnedResult.pinned)
      }
    } catch (error) {
      console.error('Error loading chat data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Detect expense/chore patterns in messages
  useEffect(() => {
    if (newMessage.trim()) {
      const expense = detectExpenseInText(newMessage)
      if (expense) {
        setDetectedExpense(expense)
      } else {
        setDetectedExpense(null)
      }
    }
  }, [newMessage])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      // Check for mentions
      const mentions = detectMentionsInText(newMessage, chatUsers)
      
      // Send message
      const result = await sendEnhancedMessage(chat.id, user.id, newMessage)
      if (result.success && result.message) {
        // Create mentions if any
        for (const mention of mentions) {
          await fetch('/api/chat/mentions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: result.message.id,
              mentionedUserId: mention.userId,
              mentionedBy: user.id
            })
          })
        }

        // Check for automatic chore detection
        const choreDetection = detectChoreInText(newMessage, chatUsers)
        if (choreDetection && choreDetection.assignedTo) {
          await assignChore(
            chat.id,
            choreDetection.choreName,
            choreDetection.assignedTo,
            user.id,
            choreDetection.dueDate,
            result.message.id
          )
        }

        setNewMessage("")
        setDetectedExpense(null)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      // First send a message about the file
      const messageResult = await sendEnhancedMessage(chat.id, user.id, `📎 ${file.name}`)
      if (messageResult.success && messageResult.message) {
        // Then upload the file
        const uploadResult = await uploadMessageFile(file, messageResult.message.id, user.id)
        if (!uploadResult.success) {
          console.error('File upload failed:', uploadResult.error)
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const handleReactionAdd = async (messageId: string, emoji: string) => {
    const result = await addMessageReaction(messageId, user.id, emoji)
    if (result.success) {
      // Update local state optimistically
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                reactions: result.reaction 
                  ? [...(msg.reactions || []), result.reaction]
                  : msg.reactions
              }
            : msg
        )
      )
    }
    setReactionPickerOpen(null)
  }

  const handleReactionRemove = async (messageId: string, emoji: string) => {
    const result = await removeMessageReaction(messageId, user.id, emoji)
    if (result.success) {
      // Update local state optimistically
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                reactions: msg.reactions?.filter(r => 
                  !(r.user_id === user.id && r.emoji === emoji)
                ) || []
              }
            : msg
        )
      )
    }
  }

  const handlePinMessage = async (messageId: string) => {
    const result = await pinMessage(chat.id, messageId, user.id)
    if (result.success && result.pinned) {
      setPinnedMessages(prev => [result.pinned!, ...prev])
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_pinned: true } : msg
        )
      )
    }
  }

  const handleUnpinMessage = async (messageId: string) => {
    const result = await unpinMessage(chat.id, messageId)
    if (result.success) {
      setPinnedMessages(prev => prev.filter(p => p.message_id !== messageId))
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_pinned: false } : msg
        )
      )
    }
  }

  const handlePollCreate = async (question: string, options: string[], multipleChoice: boolean, expiresIn?: number) => {
    try {
      // First send a message
      const messageResult = await sendEnhancedMessage(chat.id, user.id, `📊 Poll: ${question}`)
      if (messageResult.success && messageResult.message) {
        // Then create the poll
        const pollResult = await createPoll(
          chat.id,
          messageResult.message.id,
          question,
          options,
          user.id,
          multipleChoice,
          expiresIn
        )
        if (pollResult.success) {
          // Refresh messages to show the poll
          loadChatData()
        }
      }
    } catch (error) {
      console.error('Error creating poll:', error)
    }
  }

  const handleChoreAssign = async (choreName: string, assignedTo: string, dueDate?: Date) => {
    try {
      const assignedUser = chatUsers.find(u => u.id === assignedTo)
      const messageText = `🧹 Chore assigned: ${choreName} → ${assignedUser?.name || 'Unknown'}`
      
      // First send a message
      const messageResult = await sendEnhancedMessage(chat.id, user.id, messageText)
      if (messageResult.success && messageResult.message) {
        // Then create the chore assignment
        const choreResult = await assignChore(
          chat.id,
          choreName,
          assignedTo,
          user.id,
          dueDate,
          messageResult.message.id
        )
        if (choreResult.success) {
          // Refresh messages to show the chore
          loadChatData()
        }
      }
    } catch (error) {
      console.error('Error assigning chore:', error)
    }
  }

  const handleExpenseCreate = async (description: string, amount: number, splitWith: string[]) => {
    try {
      const messageText = `💰 Expense split: ${description} - $${amount.toFixed(2)}`
      
      // First send a message
      const messageResult = await sendEnhancedMessage(chat.id, user.id, messageText)
      if (messageResult.success && messageResult.message) {
        // Then create the expense split
        const expenseResult = await proposeExpenseSplit(
          chat.id,
          messageResult.message.id,
          description,
          amount,
          user.id
        )
        if (expenseResult.success) {
          // Refresh messages to show the expense
          loadChatData()
        }
      }
    } catch (error) {
      console.error('Error creating expense split:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
          <h2 className="roomeo-heading text-2xl mb-2">Loading Chat...</h2>
          <p className="roomeo-body text-emerald-primary/70 text-lg">Getting ready for roommate collaboration 🏠</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-mint-cream min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-sage/30 p-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="roomeo-button-secondary p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="roomeo-heading text-2xl text-emerald-primary">
              💬 {chat.other_user_name}
            </h1>
            <p className="roomeo-body text-sage text-sm">
              Enhanced roommate chat • {messages.length} messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sage">
              📌 {pinnedMessages.length} pinned
            </span>
            <div className="w-2 h-2 bg-moss-green rounded-full" title="Online"></div>
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col max-h-[calc(100vh-200px)]">
        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <div className="bg-white border-b border-sage/20 p-4">
            <PinnedMessages
              pinnedMessages={pinnedMessages}
              currentUserId={user.id}
              onUnpin={handleUnpinMessage}
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="relative group">
              <div className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md relative ${
                    message.sender_id === user.id
                      ? "bg-emerald-primary text-gold-accent"
                      : "bg-white text-emerald-primary border-2 border-sage/30"
                  } rounded-xl p-4 shadow-sm`}
                >
                  {/* Message Content */}
                  <div className="space-y-3">
                    {/* Text Content */}
                    {message.content && (
                      <p className="roomeo-body whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}

                    {/* File Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="space-y-2">
                        {message.attachments.map(attachment => (
                          <div key={attachment.id} className="bg-sage/10 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <a 
                                href={attachment.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="roomeo-body text-sm text-emerald-primary hover:underline truncate"
                              >
                                {attachment.file_name}
                              </a>
                            </div>
                            {attachment.file_type.startsWith('image/') && attachment.thumbnail_url && (
                              <img 
                                src={attachment.thumbnail_url} 
                                alt={attachment.file_name}
                                className="mt-2 max-w-full h-auto rounded-lg"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Poll */}
                    {message.poll && (
                      <PollDisplay
                        poll={message.poll}
                        currentUserId={user.id}
                        onVote={async (optionIndex) => {
                          await votePoll(message.poll!.id, user.id, optionIndex)
                        }}
                      />
                    )}

                    {/* Chore Assignment */}
                    {message.chore_assignment && (
                      <ChoreDisplay
                        chore={message.chore_assignment}
                        currentUserId={user.id}
                        onComplete={async () => {
                          await completeChore(message.chore_assignment!.id, user.id)
                        }}
                      />
                    )}

                    {/* Expense Split */}
                    {message.expense_split && (
                      <ExpenseDisplay
                        expense={message.expense_split}
                        currentUserId={user.id}
                        onAccept={async () => {
                          // Handle expense acceptance
                          console.log('Accept expense:', message.expense_split?.id)
                        }}
                        onReject={async () => {
                          // Handle expense rejection
                          console.log('Reject expense:', message.expense_split?.id)
                        }}
                      />
                    )}

                    {/* Message Reactions */}
                    <MessageReactions
                      reactions={message.reactions || []}
                      currentUserId={user.id}
                      onReactionAdd={(emoji) => handleReactionAdd(message.id, emoji)}
                      onReactionRemove={(emoji) => handleReactionRemove(message.id, emoji)}
                    />

                    {/* Timestamp */}
                    <div className="flex items-center justify-between text-xs opacity-75 mt-2">
                      <span>
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </span>
                      {message.is_pinned && (
                        <span title="Pinned message">📌</span>
                      )}
                    </div>
                  </div>

                  {/* Message Actions (on hover) */}
                  <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg shadow-lg border border-sage/30 flex items-center gap-1 p-1">
                    {/* React Button */}
                    <button
                      onClick={() => setReactionPickerOpen(reactionPickerOpen === message.id ? null : message.id)}
                      className="p-1 hover:bg-sage/10 rounded transition-colors"
                      title="Add reaction"
                    >
                      <span className="text-sm">😊</span>
                    </button>

                    {/* Pin Button */}
                    <button
                      onClick={() => message.is_pinned ? handleUnpinMessage(message.id) : handlePinMessage(message.id)}
                      className="p-1 hover:bg-sage/10 rounded transition-colors"
                      title={message.is_pinned ? "Unpin message" : "Pin message"}
                    >
                      <span className="text-sm">{message.is_pinned ? "📌" : "📍"}</span>
                    </button>

                    {/* Reply Button */}
                    <button
                      onClick={() => {
                        setNewMessage(`@${message.sender_name} `)
                      }}
                      className="p-1 hover:bg-sage/10 rounded transition-colors"
                      title="Reply"
                    >
                      <span className="text-sm">↩️</span>
                    </button>
                  </div>

                  {/* Reaction Picker */}
                  {reactionPickerOpen === message.id && (
                    <div className="absolute bottom-full left-0 mb-2">
                      <ReactionPicker
                        messageId={message.id}
                        currentUserId={user.id}
                        onReactionAdd={(emoji) => handleReactionAdd(message.id, emoji)}
                        isOpen={true}
                        onClose={() => setReactionPickerOpen(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Message Input */}
        <div className="bg-white border-t-2 border-sage/30">
          {/* Detected Expense Alert */}
          {detectedExpense && (
            <div className="p-3 bg-moss-green/10 border-b border-moss-green/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤖</span>
                  <span className="roomeo-body text-sm text-emerald-primary">
                    Detected expense: {detectedExpense.description} - ${detectedExpense.amount.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => setExpenseSplitOpen(true)}
                  className="text-moss-green hover:text-moss-green/80 transition-colors roomeo-body text-sm font-medium"
                >
                  Split it →
                </button>
              </div>
            </div>
          )}

          <EnhancedMessageInput
            value={newMessage}
            onChange={setNewMessage}
            onSend={handleSendMessage}
            onFileUpload={handleFileUpload}
            chatUsers={[...chatUsers, { id: user.id, name: user.name }]}
            placeholder="Type a message, @mention someone, or use $ to detect expenses..."
          />
        </div>
      </div>

      {/* Modals */}
      <PollCreator
        onPollCreate={handlePollCreate}
        isOpen={pollCreatorOpen}
        onClose={() => setPollCreatorOpen(false)}
      />

      <ChoreAssignmentModal
        chatUsers={chatUsers}
        onChoreAssign={handleChoreAssign}
        isOpen={choreAssignmentOpen}
        onClose={() => setChoreAssignmentOpen(false)}
      />

      <ExpenseSplit
        chatUsers={chatUsers}
        onExpenseCreate={handleExpenseCreate}
        detectedExpense={detectedExpense}
        isOpen={expenseSplitOpen}
        onClose={() => {
          setExpenseSplitOpen(false)
          setDetectedExpense(null)
        }}
      />
    </div>
  )
}