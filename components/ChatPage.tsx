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
}

export default function ChatPage({ user, onBack }: ChatPageProps) {
  const { chats, messages, loadMessages, sendMessage, createOrGetChat } = useChat(user)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages[selectedChatId || ""]])

  useEffect(() => {
    if (selectedChatId) {
      const unsubscribe = loadMessages(selectedChatId)
      return unsubscribe
    }
  }, [selectedChatId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChatId || !newMessage.trim()) return

    await sendMessage(selectedChatId, newMessage)
    setNewMessage("")
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  const otherParticipantId = selectedChat?.participants.find((id) => id !== user.id)
  const otherParticipantName = otherParticipantId ? selectedChat?.participantNames[otherParticipantId] : ""

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
          <div className="w-8 h-8 bg-[#F05224] border-2 border-black transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000]">
            <span className="text-white font-black text-sm transform -rotate-3">R</span>
          </div>
          <h1 className="text-xl font-black transform -skew-x-3">
            {selectedChat ? `CHAT WITH ${otherParticipantName?.toUpperCase()}` : "MESSAGES"}
          </h1>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Chat List */}
        <div className="w-1/3 border-r-4 border-black bg-gray-50">
          <div className="p-4">
            <h2 className="text-lg font-black mb-4 transform -skew-x-1">YOUR CHATS</h2>
            {chats.length === 0 ? (
              <p className="text-gray-600 font-bold">No chats yet. Start matching to begin conversations!</p>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => {
                  const otherParticipantId = chat.participants.find((id) => id !== user.id)
                  const otherParticipantName = otherParticipantId ? chat.participantNames[otherParticipantId] : ""
                  const otherParticipantAvatar = otherParticipantId ? chat.participantAvatars[otherParticipantId] : ""

                  return (
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
                          src={otherParticipantAvatar || "/placeholder.svg?height=40&width=40"}
                          alt={otherParticipantName}
                          className="w-10 h-10 rounded-full border-2 border-black"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-black truncate">{otherParticipantName}</p>
                          {chat.lastMessage && (
                            <p className="text-sm opacity-75 truncate">
                              {chat.lastMessageSender === user.id ? "You: " : ""}
                              {chat.lastMessage}
                            </p>
                          )}
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
        <div className="flex-1 flex flex-col">
          {selectedChatId ? (
            <>
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-white max-h-[calc(100vh-200px)]">
                <div className="space-y-4">
                  {(messages[selectedChatId] || []).map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg border-2 border-black font-bold ${
                          message.senderId === user.id
                            ? "bg-[#F05224] text-white shadow-[3px_3px_0px_0px_#000000]"
                            : "bg-gray-100 text-black shadow-[3px_3px_0px_0px_#000000]"
                        }`}
                      >
                        <p>{message.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
