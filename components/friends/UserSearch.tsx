// components/friends/UserSearch.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import UserCard from './UserCard'
import type { User } from '@/types/user'

interface UserSearchProps {
  user: User
  onRequestUpdate: () => void
}

interface SearchUser {
  id: string
  name: string
  profilePicture: string | null
  location: string | null
  relationshipStatus: 'stranger' | 'friend' | 'request_sent' | 'request_received'
}

export default function UserSearch({ user, onRequestUpdate }: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Debounced search function
  const searchUsers = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`)
        
        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        setSearchResults(data.users || [])
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to search users. Please try again.')
        setSearchResults([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounce search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(query)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, searchUsers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (e.target.value.trim().length >= 2) {
      setLoading(true)
    }
  }

  const handleActionComplete = () => {
    // Refresh search results and notify parent
    searchUsers(query)
    onRequestUpdate()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="p-4 border-b-2 border-[#004D40]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#004D40]" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={query}
            onChange={handleInputChange}
            className="pl-10 border-2 border-[#004D40] focus:border-[#44C76F] bg-white text-[#004D40] font-bold placeholder-[#004D40]/60"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#44C76F] animate-spin" />
          )}
        </div>
        {error && (
          <p className="text-red-600 text-sm font-bold mt-2">{error}</p>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {query.trim().length < 2 && (
          <div className="p-6 text-center">
            <Search className="w-12 h-12 text-[#004D40]/40 mx-auto mb-4" />
            <h3 className="font-black text-lg text-[#004D40] mb-2">SEARCH FOR FRIENDS</h3>
            <p className="text-[#004D40]/60 font-bold text-sm">
              Type at least 2 characters to search for users by name
            </p>
          </div>
        )}

        {query.trim().length >= 2 && !loading && searchResults.length === 0 && (
          <div className="p-6 text-center">
            <Search className="w-12 h-12 text-[#004D40]/40 mx-auto mb-4" />
            <h3 className="font-black text-lg text-[#004D40] mb-2">NO RESULTS</h3>
            <p className="text-[#004D40]/60 font-bold text-sm">
              No users found matching "{query.trim()}"
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="p-4 space-y-3">
            {searchResults.map((searchUser) => (
              <UserCard
                key={searchUser.id}
                user={searchUser}
                currentUser={user}
                relationshipStatus={searchUser.relationshipStatus}
                onActionComplete={handleActionComplete}
                showLocation={true}
              />
            ))}
          </div>
        )}

        {loading && query.trim().length >= 2 && (
          <div className="p-6 text-center">
            <Loader2 className="w-8 h-8 text-[#44C76F] animate-spin mx-auto mb-4" />
            <p className="text-[#004D40] font-bold">Searching...</p>
          </div>
        )}
      </div>
    </div>
  )
}