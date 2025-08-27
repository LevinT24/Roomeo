"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { removeMatch } from "@/services/matches"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
  age?: number
  bio?: string
  location?: string
  preferences?: {
    smoking: boolean
    drinking: boolean
    vegetarian: boolean
    pets: boolean
  }
  userType?: "seeker" | "provider"
}

interface Match {
  id: string
  name: string
  age?: number
  profilePicture: string
  userType: "seeker" | "provider"
  bio?: string
  location?: string
  chatId?: string
}

interface MatchesPageProps {
  user: User
  onStartChat?: (matchUserId: string, matchUserName: string) => void
}

export default function MatchesPage({ user, onStartChat }: MatchesPageProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMutualMatches = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all users that the current user liked
      const { data: userLikes, error: likesError } = await supabase
        .from('matches')
        .select('matched_user_id')
        .eq('user_id', user.id)
        .eq('liked', true)

      if (likesError) {
        throw new Error(likesError.message)
      }

      if (!userLikes || userLikes.length === 0) {
        setMatches([])
        setLoading(false)
        return
      }

      const likedUserIds = userLikes.map(like => like.matched_user_id)

      // Get mutual matches (users who liked the current user back)
      const { data: mutualMatches, error: mutualError } = await supabase
        .from('matches')
        .select('user_id')
        .eq('matched_user_id', user.id)
        .eq('liked', true)
        .in('user_id', likedUserIds)

      if (mutualError) {
        throw new Error(mutualError.message)
      }

      if (!mutualMatches || mutualMatches.length === 0) {
        setMatches([])
        setLoading(false)
        return
      }

      const matchUserIds = mutualMatches.map(match => match.user_id)

      // Get user data for the matched users
      const { data: matchedUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, profilepicture, age, bio, location, usertype')
        .in('id', matchUserIds)

      if (usersError) {
        throw new Error(usersError.message)
      }
      
      const { data: existingChats, error: chatsError } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${user.id},user2_id.in.(${matchUserIds.join(',')})),and(user2_id.eq.${user.id},user1_id.in.(${matchUserIds.join(',')}))`)

      if (chatsError) {
        console.error('Error fetching chats:', chatsError)
      }

      // Format the matches with chat info
      const formattedMatches: Match[] = (matchedUsers || []).map(userData => {
        const chatId = existingChats?.find(chat => 
          (chat.user1_id === user.id && chat.user2_id === userData.id) ||
          (chat.user2_id === user.id && chat.user1_id === userData.id)
        )?.id

        return {
          id: userData.id,
          name: userData.name || 'Unknown User',
          age: userData.age,
          profilePicture: userData.profilepicture || '/placeholder.svg',
          userType: userData.usertype || 'seeker',
          bio: userData.bio || '',
          location: userData.location || '',
          chatId
        }
      })

      setMatches(formattedMatches)
    } catch (error) {
      console.error('Error fetching mutual matches:', error)
      setError(error instanceof Error ? error.message : 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.id) {
      fetchMutualMatches()
    }
  }, [user, fetchMutualMatches])

  const handleStartChat = async (matchUser: Match) => {
    if (!matchUser.chatId) {
      // Create chat if it doesn't exist
      try {
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: matchUser.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating chat:', error)
          return
        }

        // Update the match with the new chat ID
        setMatches(prev => prev.map(m => 
          m.id === matchUser.id ? { ...m, chatId: newChat.id } : m
        ))
      } catch (error) {
        console.error('Error creating chat:', error)
        return
      }
    }

    // Call the parent callback to navigate to chat
    if (onStartChat) {
      onStartChat(matchUser.id, matchUser.name)
    }
  }

  const handleRemoveMatch = async (matchUser: Match) => {
    if (!confirm(`Remove ${matchUser.name} from your matches? They will appear in discovery again.`)) {
      return
    }

    try {
      const result = await removeMatch(user.id, matchUser.id)
      
      if (result.success) {
        // Remove the match from local state
        setMatches(prev => prev.filter(m => m.id !== matchUser.id))
      } else {
        console.error('Failed to remove match:', result.error)
        alert('Failed to remove match. Please try again.')
      }
    } catch (error) {
      console.error('Error removing match:', error)
      alert('Failed to remove match. Please try again.')
    }
  }

  return (
    <div className="bg-mint-cream min-h-screen">
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-mint-cream min-h-screen overflow-y-auto">
            <div className="mx-auto max-w-6xl animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="animate-slide-up">
                  <h1 className="roomeo-heading text-4xl mb-2">💕 Your Matches</h1>
                  <p className="roomeo-body text-emerald-primary/70">Connect with people who liked you back</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center animate-fade-in">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
                    <p className="roomeo-heading text-xl">Finding your matches...</p>
                    <p className="roomeo-body text-emerald-primary/70">Looking for mutual connections 💕</p>
                  </div>
                </div>
              ) : error ? (
                <div className="roomeo-card text-center py-16 animate-slide-up">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="roomeo-heading text-xl mb-2">Something went wrong</h3>
                  <p className="roomeo-body text-emerald-primary/60 mb-8">{error}</p>
                  <button
                    onClick={fetchMutualMatches}
                    className="roomeo-button-primary"
                  >
                    Try Again
                  </button>
                </div>
              ) : matches.length === 0 ? (
                <div className="roomeo-card text-center py-16 animate-slide-up">
                  <div className="text-6xl mb-4">💕</div>
                  <h3 className="roomeo-heading text-xl mb-2">No matches yet</h3>
                  <p className="roomeo-body text-emerald-primary/60 mb-8">Keep swiping to find your perfect roommate!</p>
                  <button className="roomeo-button-primary">
                    <span>🔥</span> Start Swiping
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map((match, index) => (
                    <div
                      key={match.id}
                      className="roomeo-card overflow-hidden group animate-on-scroll"
                      style={{animationDelay: `${index * 100}ms`}}
                    >
                      <div className="relative">
                        <div
                          className="w-full h-48 bg-center bg-no-repeat bg-cover"
                          style={{ backgroundImage: `url("${match.profilePicture}")` }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <h3 className="absolute bottom-4 left-4 text-white roomeo-heading text-lg">
                          {match.name}
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="roomeo-body font-semibold text-emerald-primary">{match.age}</span>
                            <span className="text-sage">•</span>
                            <span className="roomeo-body text-emerald-primary/70">
                              {match.userType === "provider" ? "Has a place" : "Looking for a place"}
                            </span>
                          </div>
                          {match.location && (
                            <div className="flex items-center gap-2">
                              <span className="text-sage">📍</span>
                              <span className="roomeo-body text-emerald-primary/70">{match.location}</span>
                            </div>
                          )}
                          {match.bio && (
                            <p className="roomeo-body text-emerald-primary text-sm line-clamp-2 border-l-3 border-sage pl-3">
                              {match.bio}
                            </p>
                          )}
                        </div>
                        <div className="mt-6 space-y-3">
                          <button 
                            onClick={() => handleStartChat(match)}
                            className="roomeo-button-primary w-full flex items-center justify-center gap-2"
                          >
                            <span>💬</span>
                            <span>Start Chat</span>
                          </button>
                          <button 
                            onClick={() => handleRemoveMatch(match)}
                            className="w-full bg-white border-2 border-alert-red text-alert-red hover:bg-alert-red hover:text-white transition-colors duration-200 rounded-lg px-4 py-3 font-medium flex items-center justify-center gap-2"
                          >
                            <span>❌</span>
                            <span>Remove Match</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
