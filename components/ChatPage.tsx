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
    <div className="bg-white text-black min-h-screen flex flex-col max-h-screen">
      {/* Header */}
      <header className="bg-white border-b-4 border-black px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full border-2 border-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#44C76F] border-2 border-[#004D40] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#004D40]">
            <span className="text-[#004D40] font-black text-sm transform -rotate-3">R</span>
          </div>
          <h1 className="text-xl font-black transform -skew-x-3">
            {initializingChat 
              ? "CONNECTING..."
              : selectedChat 
                ? `CHAT WITH ${otherParticipantName?.toUpperCase()}` 
                : "MESSAGES"
            }
          </h1>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Chat List */}
        <div className="w-1/3 border-r-4 border-black bg-gray-50">
          <div className="p-4">
            <h2 className="text-lg font-black mb-4 transform -skew-x-1">YOUR CHATS</h2>
            
            {initializingChat && (
              <div className="mb-4 p-3 bg-[#44C76F]/20 border-2 border-[#44C76F] rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#004D40] border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-bold text-[#004D40]">Connecting to seller...</span>
                </div>
              </div>
            )}
            
            {chats.length === 0 && !initializingChat ? (
              <p className="text-gray-600 font-bold">No chats yet. Start matching to begin conversations!</p>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-3 rounded-lg cursor-pointer border-2 border-black transition-all ${
                      selectedChatId === chat.id
                        ? "bg-[#F05224] text-white shadow-[4px_4px_0px_0px_#000000]"
                        : "bg-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_#000000]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={chat.other_user_avatar || "/placeholder.svg?height=40&width=40"}
                        alt={chat.other_user_name}
                        className="w-10 h-10 rounded-full border-2 border-black"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-black truncate">{chat.other_user_name}</p>
                        {chat.last_message && (
                          <p className="text-sm opacity-75 truncate">
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
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          {selectedChatId ? (
            <>
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-white max-h-[calc(100vh-200px)]">
                <div className="space-y-4">
                  {(messages[selectedChatId] || []).map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg border-2 border-black font-bold ${
                          message.sender_id === user.id
                            ? "bg-[#F05224] text-white shadow-[3px_3px_0px_0px_#000000]"
                            : "bg-gray-100 text-black shadow-[3px_3px_0px_0px_#000000]"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t-4 border-black bg-gray-50">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="TYPE YOUR MESSAGE..."
                    className="flex-1 border-4 border-black font-bold focus:border-[#F05224]"
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#F05224] hover:bg-[#D63E1A] text-white font-black px-6 border-4 border-black shadow-[4px_4px_0px_0px_#000000] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
                  >
                    SEND
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-400 mb-2 transform -skew-x-1">SELECT A CHAT</h3>
                <p className="text-gray-600 font-bold">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
