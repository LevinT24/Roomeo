// components/NotificationsDropdown.tsx

"use client"

import { useState, useEffect } from 'react'
import { Bell, X, Check, DollarSign, Users, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data: {
    settlement_id?: string
    expense_group_id?: string
    amount?: number
    payment_method?: string
    status?: string
    expense_name?: string
    payer_name?: string
  }
  related_entity_id?: string
  action_url?: string
}

interface NotificationsDropdownProps {
  userId: string
}

export default function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch notifications on mount
  useEffect(() => {
    if (userId) {
      fetchNotifications()
      
      // Set up real-time subscription
      const subscription = subscribeToNotifications()
      
      return () => {
        // Cleanup subscription on unmount
        if (subscription) {
          supabase.removeChannel(subscription)
        }
      }
    }
  }, [userId])

  // Fetch notifications from database
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) {
        console.error('Error fetching notifications:', error)
        throw error
      }
      
      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.read).length)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time notifications
  const subscribeToNotifications = () => {
    console.log('Setting up real-time notification subscription for user:', userId)
    
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification received:', payload)
          
          // Add new notification to the top of the list
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Show browser notification if permitted
          showBrowserNotification(newNotification)
          
          // Play notification sound
          playNotificationSound()
        }
      )
      .subscribe()
    
    return subscription
  }

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false
      })

      // Auto-close after 5 seconds
      setTimeout(() => browserNotif.close(), 5000)

      // Handle click on notification
      browserNotif.onclick = () => {
        window.focus()
        setIsOpen(true)
        markAsRead(notification.id)
        browserNotif.close()
      }
    }
  }

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log('Could not play notification sound:', e))
    } catch (e) {
      console.log('Notification sound not available')
    }
  }

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      console.log('Notification permission:', permission)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
      
      if (error) throw error
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      
      if (unreadIds.length === 0) return
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)
      
      if (error) throw error
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
      
      if (error) throw error
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  // Get icon for notification type
  const getNotificationIcon = (notification: Notification) => {
    if (notification.data?.status === 'approved') {
      return <Check className="w-4 h-4 text-green-600" />
    } else if (notification.data?.status === 'rejected') {
      return <X className="w-4 h-4 text-red-600" />
    } else if (notification.title.includes('Payment')) {
      return <DollarSign className="w-4 h-4 text-blue-600" />
    } else if (notification.title.includes('Expense Room')) {
      return <Users className="w-4 h-4 text-purple-600" />
    }
    return <AlertCircle className="w-4 h-4 text-gray-600" />
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString()
  }

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            requestNotificationPermission()
          }
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600">{error}</p>
                  <button 
                    onClick={fetchNotifications}
                    className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No notifications yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    We&apos;ll notify you when something happens
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">
                                {notification.title}
                                {!notification.read && (
                                  <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                                )}
                              </p>
                              <p className="text-gray-600 text-sm mt-1">
                                {notification.message}
                              </p>
                              
                              {/* Additional Info */}
                              {notification.data?.amount && (
                                <div className="mt-2 inline-flex items-center gap-2 text-xs">
                                  <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                                    {formatAmount(notification.data.amount)}
                                  </span>
                                  {notification.data.payment_method && (
                                    <span className="bg-gray-100 px-2 py-1 rounded capitalize">
                                      {notification.data.payment_method.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-400 mt-2">
                                {formatTimeAgo(notification.created_at)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Delete"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}