// Enhanced Chat Services for Roommate Features
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  EnhancedChatMessage,
  MessageReaction,
  PinnedMessage,
  MessageAttachment,
  ChatPoll,
  PollVote,
  ChoreAssignment,
  ChatExpenseSplit,
  BillReminder,
  MessageMention,
  ExpenseDetection,
  ChoreDetection,
  MentionDetection,
  ReactionResponse,
  FileUploadResponse,
  PollResponse,
  ChoreResponse,
  ExpenseResponse
} from '@/types/enhanced-chat'

export interface Chat {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  updated_at: string
  last_message?: string
  last_message_at?: string
  other_user_name?: string
  other_user_avatar?: string
}

/**
 * MESSAGE REACTIONS
 */
export const addMessageReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<ReactionResponse> => {
  try {
    const { data: reaction, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji: emoji
      })
      .select(`
        *,
        user:users!message_reactions_user_id_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      // If it's a duplicate, remove the existing reaction instead
      if (error.code === '23505') {
        return await removeMessageReaction(messageId, userId, emoji)
      }
      return { success: false, error: error.message }
    }

    return { success: true, reaction: reaction as MessageReaction }
  } catch (error) {
    console.error('Error adding reaction:', error)
    return { success: false, error: 'Failed to add reaction' }
  }
}

export const removeMessageReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<ReactionResponse> => {
  try {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing reaction:', error)
    return { success: false, error: 'Failed to remove reaction' }
  }
}

export const getMessageReactions = async (messageId: string) => {
  try {
    const { data: reactions, error } = await supabase
      .from('message_reactions')
      .select(`
        *,
        user:users!message_reactions_user_id_fkey(name, profilepicture)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, reactions: reactions as MessageReaction[] }
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return { success: false, error: 'Failed to fetch reactions' }
  }
}

/**
 * PINNED MESSAGES
 */
export const pinMessage = async (chatId: string, messageId: string, userId: string) => {
  try {
    const { data: pinned, error } = await supabase
      .from('pinned_messages')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        pinned_by: userId
      })
      .select(`
        *,
        message:messages!pinned_messages_message_id_fkey(*),
        pinned_by_user:users!pinned_messages_pinned_by_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, pinned: pinned as PinnedMessage }
  } catch (error) {
    console.error('Error pinning message:', error)
    return { success: false, error: 'Failed to pin message' }
  }
}

export const unpinMessage = async (chatId: string, messageId: string) => {
  try {
    const { error } = await supabase
      .from('pinned_messages')
      .delete()
      .eq('chat_id', chatId)
      .eq('message_id', messageId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error unpinning message:', error)
    return { success: false, error: 'Failed to unpin message' }
  }
}

export const getPinnedMessages = async (chatId: string) => {
  try {
    const { data: pinned, error } = await supabase
      .from('pinned_messages')
      .select(`
        *,
        message:messages!pinned_messages_message_id_fkey(*),
        pinned_by_user:users!pinned_messages_pinned_by_fkey(name, profilepicture)
      `)
      .eq('chat_id', chatId)
      .order('pinned_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, pinned: pinned as PinnedMessage[] }
  } catch (error) {
    console.error('Error fetching pinned messages:', error)
    return { success: false, error: 'Failed to fetch pinned messages' }
  }
}

/**
 * FILE UPLOADS
 */
export const uploadMessageFile = async (
  file: File,
  messageId: string,
  userId: string
): Promise<FileUploadResponse> => {
  try {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `chat-files/${messageId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file)

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath)

    // Create thumbnail for images
    let thumbnailUrl: string | undefined
    if (file.type.startsWith('image/')) {
      // For now, use the same URL. In production, you'd generate a thumbnail
      thumbnailUrl = urlData.publicUrl
    }

    // Save attachment record
    const { data: attachment, error } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: urlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        uploaded_by: userId
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, attachment: attachment as MessageAttachment }
  } catch (error) {
    console.error('Error uploading file:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

/**
 * POLLS
 */
export const createPoll = async (
  chatId: string,
  messageId: string,
  question: string,
  options: string[],
  userId: string,
  multipleChoice: boolean = false,
  expiresIn?: number
): Promise<PollResponse> => {
  try {
    let expiresAt: string | undefined
    if (expiresIn) {
      const expireDate = new Date()
      expireDate.setHours(expireDate.getHours() + expiresIn)
      expiresAt = expireDate.toISOString()
    }

    const pollOptions = options.map((text, index) => ({
      id: index.toString(),
      text,
      votes: 0
    }))

    const { data: poll, error } = await supabase
      .from('chat_polls')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        question,
        options: pollOptions,
        created_by: userId,
        multiple_choice: multipleChoice,
        expires_at: expiresAt
      })
      .select(`
        *,
        created_by_user:users!chat_polls_created_by_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, poll: poll as ChatPoll }
  } catch (error) {
    console.error('Error creating poll:', error)
    return { success: false, error: 'Failed to create poll' }
  }
}

export const votePoll = async (pollId: string, userId: string, optionIndex: number) => {
  try {
    // Check if poll allows multiple votes
    const { data: poll } = await supabase
      .from('chat_polls')
      .select('multiple_choice')
      .eq('id', pollId)
      .single()

    if (!poll) {
      return { success: false, error: 'Poll not found' }
    }

    // If single choice, remove existing votes
    if (!poll.multiple_choice) {
      await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', userId)
    }

    const { data: vote, error } = await supabase
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        user_id: userId,
        option_index: optionIndex
      })
      .select(`
        *,
        user:users!poll_votes_user_id_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, vote: vote as PollVote }
  } catch (error) {
    console.error('Error voting on poll:', error)
    return { success: false, error: 'Failed to vote on poll' }
  }
}

/**
 * CHORE ASSIGNMENTS
 */
export const assignChore = async (
  chatId: string,
  choreName: string,
  assignedTo: string,
  assignedBy: string,
  dueDate?: Date,
  messageId?: string
): Promise<ChoreResponse> => {
  try {
    const { data: chore, error } = await supabase
      .from('chore_assignments')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        chore_name: choreName,
        assigned_to: assignedTo,
        assigned_by: assignedBy,
        due_date: dueDate?.toISOString().split('T')[0]
      })
      .select(`
        *,
        assigned_to_user:users!chore_assignments_assigned_to_fkey(name, profilepicture),
        assigned_by_user:users!chore_assignments_assigned_by_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, chore: chore as ChoreAssignment }
  } catch (error) {
    console.error('Error assigning chore:', error)
    return { success: false, error: 'Failed to assign chore' }
  }
}

export const completeChore = async (choreId: string, userId: string) => {
  try {
    const { data: chore, error } = await supabase
      .from('chore_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', choreId)
      .eq('assigned_to', userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, chore: chore as ChoreAssignment }
  } catch (error) {
    console.error('Error completing chore:', error)
    return { success: false, error: 'Failed to complete chore' }
  }
}

/**
 * EXPENSE SPLITTING
 */
export const proposeExpenseSplit = async (
  chatId: string,
  messageId: string,
  description: string,
  amount: number,
  userId: string
): Promise<ExpenseResponse> => {
  try {
    const { data: expense, error } = await supabase
      .from('chat_expense_splits')
      .insert({
        chat_id: chatId,
        message_id: messageId,
        description,
        total_amount: amount,
        created_by: userId,
        status: 'proposed'
      })
      .select(`
        *,
        created_by_user:users!chat_expense_splits_created_by_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, expense: expense as ChatExpenseSplit }
  } catch (error) {
    console.error('Error proposing expense split:', error)
    return { success: false, error: 'Failed to propose expense split' }
  }
}

/**
 * MENTIONS
 */
export const createMention = async (
  messageId: string,
  mentionedUserId: string,
  mentionedBy: string
) => {
  try {
    const { data: mention, error } = await supabase
      .from('message_mentions')
      .insert({
        message_id: messageId,
        mentioned_user_id: mentionedUserId,
        mentioned_by: mentionedBy
      })
      .select(`
        *,
        mentioned_user:users!message_mentions_mentioned_user_id_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, mention: mention as MessageMention }
  } catch (error) {
    console.error('Error creating mention:', error)
    return { success: false, error: 'Failed to create mention' }
  }
}

/**
 * ENHANCED MESSAGE SENDING
 */
export const sendEnhancedMessage = async (
  chatId: string,
  senderId: string,
  content: string,
  replyToId?: string
): Promise<{ success: boolean; message?: EnhancedChatMessage; error?: string }> => {
  try {
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content: content.trim(),
        reply_to_id: replyToId,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      console.error('Error sending enhanced message:', error)
      return { success: false, error: error.message }
    }

    // Update chat last_message
    await supabase
      .from('chats')
      .update({
        last_message: content.trim(),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)

    const enhancedMessage: EnhancedChatMessage = {
      ...message,
      sender_name: message.sender?.name || 'Unknown',
      sender_avatar: message.sender?.profilepicture || '/placeholder.svg',
      reactions: [],
      attachments: [],
      mentions: [],
      is_pinned: false
    }

    return { success: true, message: enhancedMessage }
  } catch (error) {
    console.error('Unexpected error sending enhanced message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}

/**
 * CREATE OR GET ENHANCED CHAT
 */
export const createOrGetEnhancedChat = async (user1Id: string, user2Id: string) => {
  try {
    // Check if chat already exists between these users (either direction)
    const { data: existingChats, error: chatError } = await supabase
      .from('chats')
      .select(`
        *,
        user1:users!chats_user1_id_fkey(id, name, profilepicture),
        user2:users!chats_user2_id_fkey(id, name, profilepicture)
      `)
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)

    // If we found existing chats, return the first one
    if (!chatError && existingChats && existingChats.length > 0) {
      console.log(`✅ Found existing chat between users ${user1Id} and ${user2Id}:`, existingChats[0].id)
      const existingChat = existingChats[0]
      // Format existing chat
      const isUser1 = existingChat.user1_id === user1Id
      const otherUser = isUser1 ? existingChat.user2 : existingChat.user1
      
      const formattedChat = {
        ...existingChat,
        other_user_name: otherUser?.name || 'Unknown User',
        other_user_avatar: otherUser?.profilepicture || '/placeholder.svg'
      }

      return { success: true, chat: formattedChat }
    }

    // Create new chat if it doesn't exist
    console.log(`🔄 No existing chat found between users ${user1Id} and ${user2Id}, creating new chat...`)
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        user1:users!chats_user1_id_fkey(id, name, profilepicture),
        user2:users!chats_user2_id_fkey(id, name, profilepicture)
      `)
      .single()

    if (createError) {
      console.error('Error creating chat:', createError)
      return { success: false, error: createError.message }
    }

    // Format new chat
    const otherUser = newChat.user2
    const formattedChat = {
      ...newChat,
      other_user_name: otherUser?.name || 'Unknown User',
      other_user_avatar: otherUser?.profilepicture || '/placeholder.svg'
    }

    return { success: true, chat: formattedChat }
  } catch (error) {
    console.error('Unexpected error creating/getting enhanced chat:', error)
    return { success: false, error: 'Failed to create or get chat' }
  }
}

/**
 * GET ALL ENHANCED CHATS FOR USER
 */
export const getUserEnhancedChats = async (userId: string) => {
  try {
    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        *,
        user1:users!chats_user1_id_fkey(id, name, profilepicture),
        user2:users!chats_user2_id_fkey(id, name, profilepicture)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching enhanced chats:', error)
      return { success: false, error: error.message }
    }

    // Format chats with other user info
    const formattedChats = (chats || []).map(chat => {
      const isUser1 = chat.user1_id === userId
      const otherUser = isUser1 ? chat.user2 : chat.user1
      
      return {
        ...chat,
        other_user_name: otherUser?.name || 'Unknown User',
        other_user_avatar: otherUser?.profilepicture || '/placeholder.svg'
      }
    })

    return { success: true, chats: formattedChats }
  } catch (error) {
    console.error('Unexpected error fetching enhanced chats:', error)
    return { success: false, error: 'Failed to fetch chats' }
  }
}

/**
 * ENHANCED MESSAGE RETRIEVAL
 */
export const getEnhancedMessages = async (chatId: string) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(name, profilepicture),
        reactions:message_reactions(
          *,
          user:users!message_reactions_user_id_fkey(name, profilepicture)
        ),
        attachments:message_attachments(*),
        mentions:message_mentions(
          *,
          mentioned_user:users!message_mentions_mentioned_user_id_fkey(name, profilepicture)
        ),
        reply_to:messages!messages_reply_to_id_fkey(*),
        poll:chat_polls(
          *,
          votes:poll_votes(
            *,
            user:users!poll_votes_user_id_fkey(name, profilepicture)
          )
        ),
        expense_split:chat_expense_splits(*),
        chore_assignment:chore_assignments(
          *,
          assigned_to_user:users!chore_assignments_assigned_to_fkey(name, profilepicture),
          assigned_by_user:users!chore_assignments_assigned_by_fkey(name, profilepicture)
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    // Check which messages are pinned
    const { data: pinnedMessages } = await supabase
      .from('pinned_messages')
      .select('message_id')
      .eq('chat_id', chatId)

    const pinnedMessageIds = new Set(pinnedMessages?.map(p => p.message_id) || [])

    const enhancedMessages: EnhancedChatMessage[] = (messages || []).map(message => ({
      ...message,
      sender_name: message.sender?.name || 'Unknown',
      sender_avatar: message.sender?.profilepicture || '/placeholder.svg',
      is_pinned: pinnedMessageIds.has(message.id)
    }))

    return { success: true, messages: enhancedMessages }
  } catch (error) {
    console.error('Error fetching enhanced messages:', error)
    return { success: false, error: 'Failed to fetch messages' }
  }
}

/**
 * TEXT ANALYSIS AND DETECTION
 */
export const detectExpenseInText = (text: string): ExpenseDetection | null => {
  // Patterns for expense detection
  const patterns = [
    /(\w+(?:\s+\w+)*)\s+\$(\d+(?:\.\d{2})?)/gi, // "Pizza $20"
    /\$(\d+(?:\.\d{2})?)\s+(?:for\s+)?(\w+(?:\s+\w+)*)/gi, // "$20 for pizza"
    /paid\s+\$(\d+(?:\.\d{2})?)\s+(?:for\s+)?(\w+(?:\s+\w+)*)/gi, // "paid $20 for pizza"
    /(\w+(?:\s+\w+)*)\s+cost\s+\$(\d+(?:\.\d{2})?)/gi, // "pizza cost $20"
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      let description: string
      let amount: number
      
      if (pattern.source.includes('paid')) {
        amount = parseFloat(match[1])
        description = match[2]
      } else if (match[1].includes('$')) {
        amount = parseFloat(match[1].replace('$', ''))
        description = match[2]
      } else {
        description = match[1]
        amount = parseFloat(match[2])
      }

      return {
        description: description.trim(),
        amount,
        confidence: 0.8,
        originalText: match[0]
      }
    }
  }

  return null
}

export const detectChoreInText = (text: string, chatUsers: Array<{id: string, name: string}>): ChoreDetection | null => {
  // Patterns for chore detection
  const chorePatterns = [
    /([\w\s]+)\s+(?:today|tomorrow|this week)\s*→\s*(\w+)/gi, // "Dishes today → Alex"
    /(\w+)\s+(?:can you|could you|please)\s+([\w\s]+)/gi, // "Alex can you take out trash"
    /([\w\s]+)\s+assigned to\s+(\w+)/gi, // "Kitchen cleaning assigned to Sarah"
  ]

  for (const pattern of chorePatterns) {
    const match = pattern.exec(text)
    if (match) {
      const choreName = match[1].trim()
      const assignedName = match[2]?.trim()
      
      // Find user by name
      const assignedUser = chatUsers.find(user => 
        user.name.toLowerCase().includes(assignedName?.toLowerCase() || '')
      )

      return {
        choreName,
        assignedTo: assignedUser?.id,
        confidence: 0.7,
        originalText: match[0]
      }
    }
  }

  return null
}

export const detectMentionsInText = (text: string, chatUsers: Array<{id: string, name: string}>): MentionDetection[] => {
  const mentions: MentionDetection[] = []
  const mentionPattern = /@(\w+)/g
  let match

  while ((match = mentionPattern.exec(text)) !== null) {
    const username = match[1]
    const user = chatUsers.find(u => 
      u.name.toLowerCase().includes(username.toLowerCase())
    )

    if (user) {
      mentions.push({
        userId: user.id,
        username: user.name,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      })
    }
  }

  return mentions
}

/**
 * BILL REMINDERS BOT
 */
export const createBillReminder = async (
  chatId: string,
  title: string,
  dueDate: Date,
  userId: string,
  amount?: number,
  description?: string,
  frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'
) => {
  try {
    const { data: reminder, error } = await supabase
      .from('bill_reminders')
      .insert({
        chat_id: chatId,
        title,
        description,
        amount,
        due_date: dueDate.toISOString().split('T')[0],
        reminder_frequency: frequency,
        created_by: userId
      })
      .select(`
        *,
        created_by_user:users!bill_reminders_created_by_fkey(name, profilepicture)
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, reminder: reminder as BillReminder }
  } catch (error) {
    console.error('Error creating bill reminder:', error)
    return { success: false, error: 'Failed to create bill reminder' }
  }
}

/**
 * REAL-TIME SUBSCRIPTIONS
 */
export const subscribeToEnhancedChat = (
  chatId: string,
  onMessage: (message: EnhancedChatMessage) => void,
  onReaction: (reaction: MessageReaction) => void,
  onPoll: (poll: ChatPoll) => void,
  onChore: (chore: ChoreAssignment) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`enhanced-chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      async (payload) => {
        const messageData = await getEnhancedMessages(chatId)
        if (messageData.success && messageData.messages) {
          const newMessage = messageData.messages.find(m => m.id === payload.new.id)
          if (newMessage) {
            onMessage(newMessage)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions'
      },
      async (payload) => {
        const reactionData = await getMessageReactions(payload.new.message_id)
        if (reactionData.success && reactionData.reactions) {
          const newReaction = reactionData.reactions.find(r => r.id === payload.new.id)
          if (newReaction) {
            onReaction(newReaction)
          }
        }
      }
    )
    .subscribe()

  return channel
}

// Simple subscription compatible with useChat hook
export const subscribeToMessages = (
  chatId: string, 
  onNewMessage: (message: EnhancedChatMessage) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      async (payload) => {
        console.log('🔔 Real-time message received:', payload.new)
        
        // Fetch the complete message with enhanced data
        const messageData = await getEnhancedMessages(chatId)
        if (messageData.success && messageData.messages) {
          const newMessage = messageData.messages.find(m => m.id === payload.new.id)
          if (newMessage) {
            onNewMessage(newMessage)
          }
        }
      }
    )
    .subscribe((status) => {
      console.log(`📡 Subscription status for chat ${chatId}:`, status)
    })

  console.log(`🔔 Setting up real-time subscription for chat: ${chatId}`)
  return channel
}

// Unsubscribe function
export const unsubscribeFromMessages = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel)
}

// Mark messages as read function
export const markMessagesAsRead = async (chatId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', userId) // Don't mark own messages as read
      .eq('is_read', false)

    if (error) {
      console.error('Error marking messages as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error marking messages as read:', error)
    return { success: false, error: 'Failed to mark messages as read' }
  }
}