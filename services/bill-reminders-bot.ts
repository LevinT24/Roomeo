// Bill Reminders Bot Service
import { supabase } from '@/lib/supabase'
import { sendEnhancedMessage as sendMessage } from '@/services/enhanced-chat'
import { createBillReminder } from '@/services/enhanced-chat'
import type { BillReminder } from '@/types/enhanced-chat'

/**
 * Bill Reminders Bot - Automated reminders for roommate bills
 */

export interface BillReminderConfig {
  chatId: string
  title: string
  description?: string
  amount?: number
  dueDate: Date
  frequency: 'daily' | 'weekly' | 'monthly'
  reminderDays: number[] // Days before due date to send reminders
  userId: string
}

// System user ID for bot messages
const BOT_USER_ID = 'bot-bill-reminders'

/**
 * Process all pending bill reminders
 */
export const processBillReminders = async (): Promise<void> => {
  try {
    const today = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(today.getDate() + 3)

    // Get all active bill reminders that are due within the next 3 days
    const { data: reminders, error } = await supabase
      .from('bill_reminders')
      .select(`
        *,
        created_by_user:users!bill_reminders_created_by_fkey(name, profilepicture)
      `)
      .eq('is_active', true)
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])

    if (error) {
      console.error('Error fetching bill reminders:', error)
      return
    }

    for (const reminder of reminders || []) {
      await processIndividualReminder(reminder)
    }
  } catch (error) {
    console.error('Error processing bill reminders:', error)
  }
}

/**
 * Process an individual bill reminder
 */
const processIndividualReminder = async (reminder: BillReminder): Promise<void> => {
  try {
    const dueDate = new Date(reminder.due_date)
    const today = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Check if we should send a reminder today
    const shouldRemind = shouldSendReminder(reminder, daysUntilDue)
    
    if (!shouldRemind) {
      return
    }

    // Generate reminder message
    const message = generateReminderMessage(reminder, daysUntilDue)

    // Send reminder message to chat
    await sendMessage(reminder.chat_id, BOT_USER_ID, message)

    // Update last reminded timestamp
    await supabase
      .from('bill_reminders')
      .update({ last_reminded: new Date().toISOString() })
      .eq('id', reminder.id)

    console.log(`✅ Sent bill reminder for: ${reminder.title}`)
  } catch (error) {
    console.error(`Error processing reminder ${reminder.id}:`, error)
  }
}

/**
 * Determine if we should send a reminder today
 */
const shouldSendReminder = (reminder: BillReminder, daysUntilDue: number): boolean => {
  // Don't send if already reminded today
  if (reminder.last_reminded) {
    const lastReminded = new Date(reminder.last_reminded)
    const today = new Date()
    if (lastReminded.toDateString() === today.toDateString()) {
      return false
    }
  }

  // Check frequency and days until due
  switch (reminder.reminder_frequency) {
    case 'daily':
      return daysUntilDue <= 3 // Remind daily for the last 3 days
    case 'weekly':
      return daysUntilDue <= 7 && daysUntilDue % 3 === 0 // Remind every 3 days in the last week
    case 'monthly':
      return daysUntilDue <= 5 // Remind only in the last 5 days
    default:
      return false
  }
}

/**
 * Generate reminder message based on reminder details and urgency
 */
const generateReminderMessage = (reminder: BillReminder, daysUntilDue: number): string => {
  const urgencyEmoji = daysUntilDue <= 1 ? '🚨' : daysUntilDue <= 3 ? '⚠️' : '⚡'
  const amountText = reminder.amount ? ` ($${reminder.amount.toFixed(2)})` : ''
  
  let message = `${urgencyEmoji} **Bill Reminder**\n\n`
  message += `📋 **${reminder.title}**${amountText}\n`
  
  if (reminder.description) {
    message += `📝 ${reminder.description}\n`
  }
  
  message += `📅 Due: ${new Date(reminder.due_date).toLocaleDateString()}\n`
  
  if (daysUntilDue === 0) {
    message += `⏰ **DUE TODAY!**`
  } else if (daysUntilDue === 1) {
    message += `⏰ **Due tomorrow**`
  } else {
    message += `⏰ Due in ${daysUntilDue} days`
  }

  // Add helpful suggestions
  message += `\n\n💡 *Don't forget to split this expense with your roommates when you pay it!*`

  return message
}

/**
 * Create a recurring bill reminder
 */
export const createRecurringBillReminder = async (config: BillReminderConfig): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await createBillReminder(
      config.chatId,
      config.title,
      config.dueDate,
      config.userId,
      config.amount,
      config.description,
      config.frequency
    )

    if (result.success) {
      // Send confirmation message
      const confirmationMessage = `✅ **Bill Reminder Set**\n\n` +
        `📋 ${config.title}\n` +
        `📅 Due: ${config.dueDate.toLocaleDateString()}\n` +
        `🔔 Frequency: ${config.frequency}\n\n` +
        `I'll remind you before this bill is due! 🤖`

      await sendMessage(config.chatId, BOT_USER_ID, confirmationMessage)
    }

    return result
  } catch (error) {
    console.error('Error creating recurring bill reminder:', error)
    return { success: false, error: 'Failed to create bill reminder' }
  }
}

/**
 * Update bill reminder settings
 */
export const updateBillReminder = async (
  reminderId: string,
  updates: Partial<BillReminderConfig>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = {}
    
    if (updates.title) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.amount !== undefined) updateData.amount = updates.amount
    if (updates.dueDate) updateData.due_date = updates.dueDate.toISOString().split('T')[0]
    if (updates.frequency) updateData.reminder_frequency = updates.frequency

    const { error } = await supabase
      .from('bill_reminders')
      .update(updateData)
      .eq('id', reminderId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating bill reminder:', error)
    return { success: false, error: 'Failed to update bill reminder' }
  }
}

/**
 * Disable/delete a bill reminder
 */
export const disableBillReminder = async (reminderId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('bill_reminders')
      .update({ is_active: false })
      .eq('id', reminderId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error disabling bill reminder:', error)
    return { success: false, error: 'Failed to disable bill reminder' }
  }
}

/**
 * Get all bill reminders for a chat
 */
export const getChatBillReminders = async (chatId: string) => {
  try {
    const { data: reminders, error } = await supabase
      .from('bill_reminders')
      .select(`
        *,
        created_by_user:users!bill_reminders_created_by_fkey(name, profilepicture)
      `)
      .eq('chat_id', chatId)
      .eq('is_active', true)
      .order('due_date', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, reminders: reminders as BillReminder[] }
  } catch (error) {
    console.error('Error fetching chat bill reminders:', error)
    return { success: false, error: 'Failed to fetch bill reminders' }
  }
}

/**
 * Smart bill detection from messages
 */
export const detectBillInMessage = (message: string): { title: string; amount?: number; confidence: number } | null => {
  const billPatterns = [
    /(?:electric|electricity|power)\s+bill.*?\$?(\d+(?:\.\d{2})?)/i,
    /(?:gas|heating)\s+bill.*?\$?(\d+(?:\.\d{2})?)/i,
    /(?:water|utility)\s+bill.*?\$?(\d+(?:\.\d{2})?)/i,
    /(?:internet|wifi|cable)\s+bill.*?\$?(\d+(?:\.\d{2})?)/i,
    /(?:rent|rental)\s+.*?\$?(\d+(?:\.\d{2})?)/i,
    /bill.*?(\w+).*?\$?(\d+(?:\.\d{2})?)/i
  ]

  for (const pattern of billPatterns) {
    const match = pattern.exec(message)
    if (match) {
      let title: string
      let amount: number | undefined

      if (pattern.source.includes('electric')) {
        title = 'Electricity Bill'
        amount = parseFloat(match[1])
      } else if (pattern.source.includes('gas')) {
        title = 'Gas Bill'
        amount = parseFloat(match[1])
      } else if (pattern.source.includes('water')) {
        title = 'Water Bill'
        amount = parseFloat(match[1])
      } else if (pattern.source.includes('internet')) {
        title = 'Internet Bill'
        amount = parseFloat(match[1])
      } else if (pattern.source.includes('rent')) {
        title = 'Rent Payment'
        amount = parseFloat(match[1])
      } else {
        title = `${match[1]} Bill`
        amount = match[2] ? parseFloat(match[2]) : undefined
      }

      return {
        title,
        amount,
        confidence: 0.8
      }
    }
  }

  return null
}

/**
 * Initialize bot user in database if not exists
 */
export const initializeBotUser = async (): Promise<void> => {
  try {
    const { data: existingBot } = await supabase
      .from('users')
      .select('id')
      .eq('id', BOT_USER_ID)
      .single()

    if (!existingBot) {
      await supabase
        .from('users')
        .insert({
          id: BOT_USER_ID,
          email: 'bot@roomeo.app',
          name: 'Bill Reminders Bot',
          profilepicture: '🤖',
          usertype: 'bot',
          created_at: new Date().toISOString()
        })
      
      console.log('✅ Bill Reminders Bot user initialized')
    }
  } catch (error) {
    console.error('Error initializing bot user:', error)
  }
}

/**
 * Setup cron job to run bill reminders (Node.js/server environment)
 */
export const setupBillRemindersCron = (): void => {
  // This would typically use node-cron or similar
  // For now, we'll setup a simple interval
  
  if (typeof window === 'undefined') { // Server-side only
    // Run every hour during business hours (9 AM - 6 PM)
    setInterval(async () => {
      const hour = new Date().getHours()
      if (hour >= 9 && hour <= 18) {
        await processBillReminders()
      }
    }, 60 * 60 * 1000) // 1 hour

    console.log('✅ Bill reminders cron job started')
  }
}