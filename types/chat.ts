export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderAvatar: string
  message: string
  timestamp: Date
  read: boolean
}

export interface Chat {
  id: string
  participants: string[]
  participantNames: { [userId: string]: string }
  participantAvatars: { [userId: string]: string }
  lastMessage?: string
  lastMessageTime?: Date
  lastMessageSender?: string
  createdAt: Date
  updatedAt: Date
}
