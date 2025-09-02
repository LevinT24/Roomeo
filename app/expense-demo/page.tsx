"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ExpensesPage from '@/components/ExpensesPage'

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

export default function ExpenseDemoPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !authUser) {
          console.error('Authentication required')
          setLoading(false)
          return
        }

        // Get user profile data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email, profilePicture')
          .eq('id', authUser.id)
          .single()

        if (userError) {
          console.error('Error fetching user data:', userError)
          setLoading(false)
          return
        }

        setUser({
          id: userData.id,
          email: userData.email || authUser.email || '',
          name: userData.name || 'Anonymous User',
          profilePicture: userData.profilePicture || ''
        })
      } catch (error) {
        console.error('Error in getUser:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
          <p className="roomeo-body text-emerald-primary/70 text-lg">Loading your expenses... 💸</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-mint-cream min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="roomeo-heading text-2xl mb-4">Authentication Required</h1>
          <p className="roomeo-body text-emerald-primary/70">Please log in to access your expenses.</p>
        </div>
      </div>
    )
  }

  return <ExpensesPage user={user} />
}