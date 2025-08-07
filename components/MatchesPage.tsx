"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

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

  useEffect(() => {
    if (user?.id) {
      fetchMutualMatches()
    }
  }, [user])

  const fetchMutualMatches = async () => {
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
  }

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

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          {/* Main Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 bg-white min-h-screen overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-black tracking-tight text-black mb-3 transform -skew-x-2">
                  MUTUAL MATCHES
                </h2>
                <div className="w-24 h-2 bg-[#F05224] mx-auto transform skew-x-12"></div>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-black text-black mb-2 transform -skew-x-1">NO MATCHES YET</h3>
                  <p className="text-lg font-bold text-gray-700">KEEP SWIPING TO FIND YOUR PERFECT ROOMMATE!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="bg-white rounded-lg border-4 border-black shadow-[6px_6px_0px_0px_#000000] overflow-hidden transition-transform duration-300 hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#000000] cursor-pointer group"
                    >
                      <div className="relative">
                        <div
                          className="w-full h-48 bg-center bg-no-repeat bg-cover"
                          style={{ backgroundImage: `url("${match.profilePicture}")` }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <h3 className="absolute bottom-4 left-4 text-white text-lg font-black transform -skew-x-1">
                          {match.name}
                        </h3>
                      </div>
                      <div className="p-4">
                        <p className="text-black font-bold text-sm line-clamp-3 border-l-4 border-[#F05224] pl-3">
                          {match.age}, {match.userType === "provider" ? "HAS A PLACE" : "LOOKING FOR A PLACE"}
                          {match.location && ` • 📍 ${match.location}`}
                          {match.bio && `. ${match.bio}`}
                        </p>
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => handleStartChat(match)}
                            className="text-sm font-black text-[#F05224] bg-[#F05224]/10 px-4 py-2 rounded border-2 border-[#F05224] hover:bg-[#F05224] hover:text-white transition-all transform hover:translate-x-1 hover:translate-y-1"
                          >
                            💬 START CHAT
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
