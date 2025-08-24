"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useChat } from "@/hooks/useChat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User } from "@/types/user"

interface ChatPageProps {
  user: User
  onBack: () => void
  chatTarget?: {sellerId: string, listingId?: string} | null
}

export default function ChatPage({ user, onBack, chatTarget }: ChatPageProps) {
  const { chats, messages, loadMessages, sendMessage, createOrGetChatWith } = useChat(user)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [initializingChat, setInitializingChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initializedSellerRef = useRef<string | null>(null)
  const initializationInProgressRef = useRef<boolean>(false)
  const initializationPromiseRef = useRef<Promise<any> | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages[selectedChatId || ""]])

  // Auto-initialize chat when coming from marketplace
  useEffect(() => {
    const initializeMarketplaceChat = async () => {
      // Early exit if no chat target
      if (!chatTarget?.sellerId) {
        return
      }

      const sellerId = chatTarget.sellerId

      // Check if already initialized this seller
      if (initializedSellerRef.current === sellerId) {
        console.log("🔄 Seller already initialized, skipping:", sellerId)
        return
      }

      // Check if initialization is in progress
      if (initializationInProgressRef.current) {
        console.log("🔄 Initialization already in progress, skipping:", sellerId)
        return
      }

      // Check if there's already a promise for this seller
      if (initializationPromiseRef.current) {
        console.log("🔄 Promise already exists, waiting for it to complete:", sellerId)
        try {
          await initializationPromiseRef.current
        } catch (error) {
          console.error("❌ Error waiting for existing promise:", error)
        }
        return
      }

      console.log("🔄 Starting chat initialization with seller:", sellerId)

      // Mark as in progress immediately
      initializationInProgressRef.current = true
      setInitializingChat(true)

      // Create the initialization promise
      const initPromise = (async () => {
        try {
          // Wait a bit to debounce rapid calls
          await new Promise(resolve => setTimeout(resolve, 100))

          // Double-check if we already have a chat with this seller
          const existingChat = chats.find(chat => 
            chat.user1_id === sellerId || chat.user2_id === sellerId
          )
          
          if (existingChat) {
            console.log("✅ Found existing chat with seller:", existingChat.id)
            setSelectedChatId(existingChat.id)
            initializedSellerRef.current = sellerId
            return existingChat
          }

          console.log("🔄 Creating new chat with seller:", sellerId)
          const chatResult = await createOrGetChatWith(sellerId)
          
          if (chatResult) {
            console.log("✅ Chat successfully created/retrieved:", chatResult.id)
            setSelectedChatId(chatResult.id)
            initializedSellerRef.current = sellerId
            return chatResult
          } else {
            console.error("❌ Failed to create/get chat with seller")
            throw new Error("Failed to create chat")
          }
        } catch (error) {
          console.error("❌ Error in chat initialization:", error)
          // Reset on error so user can retry
          initializedSellerRef.current = null
          throw error
        }
      })()

      // Store the promise
      initializationPromiseRef.current = initPromise

      try {
        await initPromise
      } catch (error) {
        console.error("❌ Chat initialization failed:", error)
      } finally {
        // Clean up
        setInitializingChat(false)
        initializationInProgressRef.current = false
        initializationPromiseRef.current = null
      }
    }

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce the initialization to prevent rapid-fire calls
    debounceTimerRef.current = setTimeout(() => {
      initializeMarketplaceChat()
    }, 200) // 200ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [chatTarget?.sellerId]) // Only depend on sellerId, not the whole chatTarget or chats

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      // Reset all refs
      initializedSellerRef.current = null
      initializationInProgressRef.current = false
      initializationPromiseRef.current = null
    }
  }, [])

  // Reset initialization state when chatTarget sellerId changes
  useEffect(() => {
    // If the sellerId changed, reset previous initialization
    const currentSellerId = chatTarget?.sellerId
    const previousSellerId = initializedSellerRef.current
    
    if (currentSellerId && previousSellerId && currentSellerId !== previousSellerId) {
      console.log("🔄 Seller ID changed, resetting initialization state")
      initializedSellerRef.current = null
      initializationInProgressRef.current = false
      initializationPromiseRef.current = null
    }
  }, [chatTarget?.sellerId])

  useEffect(() => {
    if (selectedChatId) {
      let cleanup: (() => void) | undefined
      
      const setupMessages = async () => {
        cleanup = await loadMessages(selectedChatId)
      }
      
      setupMessages()
      
      return () => {
        if (cleanup) cleanup()
      }
    }
  }, [selectedChatId, loadMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChatId || !newMessage.trim()) return

    await sendMessage(selectedChatId, newMessage)
    setNewMessage("")
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  const otherParticipantName = selectedChat?.other_user_name || ""

  return (
    <div className="bg-mint-cream min-h-screen">
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-mint-cream min-h-screen overflow-y-auto">
            <div className="mx-auto max-w-6xl animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="animate-slide-up flex items-center gap-4">
                  <button onClick={onBack} className="roomeo-button-secondary p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="roomeo-heading text-4xl mb-2">
                      💬 {initializingChat 
                        ? "Connecting..."
                        : selectedChat 
                          ? `Chat with ${otherParticipantName}` 
                          : "Messages"
                      }
                    </h1>
                    <p className="roomeo-body text-emerald-primary/70">Stay connected with your roommates</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Chat List */}
                <div className="roomeo-card p-6">
                  <h2 className="roomeo-heading text-xl mb-6">Your Chats</h2>
                  
                  {initializingChat && (
                    <div className="mb-4 p-4 bg-moss-green/10 border border-moss-green/30 rounded-xl animate-slide-up">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-sage/30 border-t-emerald-primary"></div>
                        <span className="roomeo-body font-medium text-emerald-primary">Connecting to seller...</span>
                      </div>
                    </div>
                  )}
                  
                  {chats.length === 0 && !initializingChat ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="roomeo-body text-emerald-primary/60">No chats yet. Start matching to begin conversations!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {chats.map((chat, index) => (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChatId(chat.id)}
                          className={`p-4 rounded-xl cursor-pointer transition-all animate-on-scroll ${
                            selectedChatId === chat.id
                              ? "bg-emerald-primary text-gold-accent shadow-soft"
                              : "bg-sage/10 hover:bg-sage/20 text-emerald-primary"
                          }`}
                          style={{animationDelay: `${index * 100}ms`}}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-sage/30"
                              style={{
                                backgroundImage: `url("${chat.other_user_avatar || "/placeholder.svg?height=48&width=48"}")`,
                              }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <p className="roomeo-body font-semibold truncate">{chat.other_user_name}</p>
                              {chat.last_message && (
                                <p className="roomeo-body text-sm opacity-75 truncate">
                                  {chat.last_message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="lg:col-span-2 roomeo-card flex flex-col">
                  {selectedChatId ? (
                    <>
                      {/* Messages */}
                      <div className="flex-1 p-6 overflow-y-auto max-h-[400px]">
                        <div className="space-y-4">
                          {(messages[selectedChatId] || []).map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-soft ${
                                  message.sender_id === user.id
                                    ? "bg-emerald-primary text-gold-accent"
                                    : "bg-sage/20 text-emerald-primary"
                                }`}
                              >
                                <p className="roomeo-body">{message.content}</p>
                                <p className="roomeo-body text-xs opacity-75 mt-1">
                                  {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>

                      {/* Message Input */}
                      <form onSubmit={handleSendMessage} className="p-6 border-t border-sage/30">
                        <div className="flex gap-3">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 roomeo-body border-2 border-sage/30 rounded-xl focus:border-moss-green"
                          />
                          <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="roomeo-button-primary px-6"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="roomeo-heading text-xl mb-2">Select a Chat</h3>
                        <p className="roomeo-body text-emerald-primary/60">Choose a conversation to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
