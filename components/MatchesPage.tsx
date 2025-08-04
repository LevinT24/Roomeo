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
          {/* Header */}
          <header className="flex items-center justify-between whitespace-nowrap border-b-4 border-black px-10 py-4 bg-white">
            <div className="flex items-center gap-4 text-black">
              <div className="w-6 h-6 bg-[#F05224] border-2 border-black transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000]">
                <span className="text-white font-black text-xs transform -rotate-3">R</span>
              </div>
              <h1 className="text-xl font-black leading-tight tracking-[-0.015em] transform -skew-x-3">ROOMIO</h1>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a
                className="text-sm font-black text-black hover:text-[#F05224] transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                href="#"
              >
                FIND ROOMMATES
              </a>
              <a
                className="text-sm font-black text-black hover:text-[#F05224] transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                href="#"
              >
                EXPENSES
              </a>
              <a
                className="text-sm font-black text-black hover:text-[#F05224] transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                href="#"
              >
                MARKETPLACE
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white text-black hover:bg-gray-100 transition-colors border-2 border-black">
                <svg
                  fill="currentColor"
                  height="24"
                  viewBox="0 0 256 256"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"></path>
                </svg>
              </button>
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-black"
                style={{ backgroundImage: `url("${user?.profilePicture || "/placeholder.svg?height=40&width=40"}")` }}
              ></div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 bg-white min-h-[calc(100vh-140px)] overflow-y-auto">
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
