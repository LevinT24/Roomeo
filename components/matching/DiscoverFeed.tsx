"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Heart, X, Star, Filter, Users, Search, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import ProfileCard from "@/components/profile/ProfileCard"
import ProfileModal from "@/components/profile/ProfileModal"
import { useToast } from "@/hooks/use-toast"
import type { RoommateProfile, MatchType, UserRole } from "@/types/roommate"

interface DiscoverFeedProps {
  currentUserRole: UserRole
  onStartChat?: (profileId: string) => void
}

interface FilterOptions {
  ageMin?: number
  ageMax?: number
  gender?: string
  location?: string
  budgetMax?: number
  roomType?: string
}

export default function DiscoverFeed({ currentUserRole, onStartChat }: DiscoverFeedProps) {
  const [profiles, setProfiles] = useState<RoommateProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<RoommateProfile | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Debug logging
  console.log('DiscoverFeed render:', { showFilters, filters })
  const { toast } = useToast()

  const targetRole = currentUserRole === 'seeker' ? 'provider' : 'seeker'

  // Fetch profiles
  const fetchProfiles = useCallback(async (pageNum: number = 1, fresh: boolean = false) => {
    try {
      if (fresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const searchParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10'
      })

      // Add filters to search params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/roommate/discover?${searchParams}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch profiles')
      }

      if (fresh || pageNum === 1) {
        setProfiles(data.profiles || [])
      } else {
        setProfiles(prev => [...prev, ...(data.profiles || [])])
      }

      setHasMore(data.has_more || false)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching profiles:', error)
      toast({
        title: "Error",
        description: "Failed to load profiles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, toast])

  // Handle match actions
  const handleMatchAction = async (profileId: string, action: MatchType) => {
    try {
      setActionLoading(profileId)

      const response = await fetch('/api/roommate/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: profileId, action })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to perform match action')
      }

      // Remove profile from feed
      setProfiles(prev => prev.filter(p => p.id !== profileId))

      // Show success message
      if (data.is_mutual_match) {
        toast({
          title: "🎉 It's a Match!",
          description: data.message || "You can now chat with each other!",
        })

        // Auto-start chat if it's a mutual match
        if (data.chat_id && onStartChat) {
          setTimeout(() => onStartChat(profileId), 1500)
        }
      } else if (action === 'like') {
        toast({
          title: "Liked!",
          description: "If they like you back, you'll get a match!",
        })
      } else if (action === 'super_like') {
        toast({
          title: "Super Liked! ⭐",
          description: "They'll know you're really interested!",
        })
      }

      // If we're running low on profiles, fetch more
      if (profiles.length <= 3 && hasMore) {
        fetchProfiles(page + 1)
      }
    } catch (error) {
      console.error('Error performing match action:', error)
      toast({
        title: "Error",
        description: "Failed to perform action. Please try again.",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Apply filters
  const applyFilters = () => {
    setPage(1)
    fetchProfiles(1, true)
    setShowFilters(false)
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({})
    setPage(1)
    fetchProfiles(1, true)
    setShowFilters(false)
  }

  // Load more profiles
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchProfiles(page + 1)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProfiles(1)
  }, [fetchProfiles])

  const getEmptyStateMessage = () => {
    if (currentUserRole === 'seeker') {
      return {
        title: "No rooms available",
        description: "We couldn't find any room providers matching your criteria. Try adjusting your filters or check back later!",
        icon: <Crown className="w-12 h-12 text-amber-500" />
      }
    } else {
      return {
        title: "No seekers found",
        description: "We couldn't find any room seekers matching your criteria. Try adjusting your filters or check back later!",
        icon: <Users className="w-12 h-12 text-blue-500" />
      }
    }
  }

  const emptyState = getEmptyStateMessage()

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Discover {targetRole === 'provider' ? 'Rooms' : 'Seekers'}
          </h1>
          <p className="text-gray-600">
            {targetRole === 'provider' 
              ? 'Find the perfect room for you' 
              : 'Find your ideal roommate'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Debug: Simple filter button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              console.log('Direct button clicked, setting showFilters to true')
              setShowFilters(true)
            }}
            className="mr-2"
          >
            🔧 Test Filter
          </Button>
          
          {/* Filters */}
          <Dialog open={showFilters} onOpenChange={setShowFilters}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  console.log('Filter button clicked', { showFilters })
                  e.preventDefault()
                  setShowFilters(true)
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {Object.values(filters).some(value => value !== undefined && value !== '') && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.values(filters).filter(value => value !== undefined && value !== '').length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Filter Profiles</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Age</label>
                    <Input
                      type="number"
                      placeholder="18"
                      value={filters.ageMin || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, ageMin: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Age</label>
                    <Input
                      type="number"
                      placeholder="65"
                      value={filters.ageMax || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, ageMax: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Gender</label>
                  <Select value={filters.gender || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value || undefined }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Location</label>
                  <Input
                    placeholder="City or area"
                    value={filters.location || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value || undefined }))}
                  />
                </div>

                {targetRole === 'provider' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Budget</label>
                    <Input
                      type="number"
                      placeholder="2000"
                      value={filters.budgetMax || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                )}

                {targetRole === 'provider' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Room Type</label>
                    <Select value={filters.roomType || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, roomType: value || undefined }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="private">Private Room</SelectItem>
                        <SelectItem value="shared">Shared Room</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="apartment">Entire Apartment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={resetFilters} className="flex-1">
                    Reset
                  </Button>
                  <Button onClick={applyFilters} className="flex-1">
                    Apply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfiles(1, true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {Object.values(filters).some(value => value !== undefined && value !== '') && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || value === '') return null
            return (
              <Badge key={key} variant="secondary" className="flex items-center">
                <span className="capitalize">{key}:</span>
                <span className="ml-1">{value}</span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, [key]: undefined }))}
                  className="ml-2 text-xs hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )
          })}
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Finding perfect matches for you...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && profiles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex justify-center mb-4">
              {emptyState.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emptyState.title}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {emptyState.description}
            </p>
            <Button onClick={() => fetchProfiles(1, true)} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profiles Grid */}
      {profiles.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {profiles.map((profile) => (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                className="cursor-pointer"
                onClick={() => setSelectedProfile(profile)}
              >
                <ProfileCard
                  profile={profile}
                  onMatchAction={handleMatchAction}
                  loading={actionLoading === profile.id}
                  showActions={true}
                  compact={true}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Load More */}
      {hasMore && profiles.length > 0 && (
        <div className="text-center mt-8">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading more...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Load More Profiles
              </>
            )}
          </Button>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onMatchAction={handleMatchAction}
        onStartChat={onStartChat}
        loading={actionLoading === selectedProfile?.id}
      />

      {/* Stats */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          {profiles.length > 0 && `Showing ${profiles.length} profiles`}
          {hasMore && ` • More available`}
        </div>
      </div>
    </div>
  )
}