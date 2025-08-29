"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, SlidersHorizontal, Plus, Loader2, AlertCircle } from "lucide-react"
import ListingCard from "@/components/ListingCard"
import AddListingPage from "@/components/AddListingPage"
import { getListings } from "@/services/marketplace"
import { createOrGetEnhancedChat as createOrGetChat } from "@/services/enhanced-chat"
import type { Listing, ListingFilters, ListingSortOptions } from "@/types/listing"
import type { User } from "@/types/user"

interface MarketplacePageProps {
  user: User
  onStartChat?: (sellerId: string, listingId: string) => void
}

export default function MarketplacePage({ user, onStartChat }: MarketplacePageProps) {
  const [currentView, setCurrentView] = useState<'marketplace' | 'add-listing'>('marketplace')
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ListingFilters>({})
  const [sortOption, setSortOption] = useState<ListingSortOptions>({ 
    field: 'created_at', 
    direction: 'desc' 
  })

  // Load listings
  const loadListings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentFilters = {
        ...filters,
        search: searchQuery.trim() || undefined
      }
      
      console.log("🔄 Loading listings with filters:", currentFilters, "sort:", sortOption)
      const data = await getListings(currentFilters, sortOption)
      setListings(data)
      console.log("✅ Loaded listings:", data.length)
      
    } catch (err) {
      console.error("❌ Error loading listings:", err)
      setError(err instanceof Error ? err.message : "Failed to load listings")
    } finally {
      setLoading(false)
    }
  }, [filters, searchQuery, sortOption])

  // Load listings on mount and when filters/sort change
  useEffect(() => {
    loadListings()
  }, [filters, sortOption, loadListings])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadListings()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery, loadListings])

  const handleChatWithSeller = async (sellerId: string, listingId: string) => {
    // Safety check: prevent user from chatting with themselves
    if (user.id === sellerId) {
      console.log("❌ User cannot chat with themselves")
      return
    }

    console.log("🔄 Starting chat with seller:", sellerId, "for listing:", listingId)
    
    try {
      // Use existing createOrGetChat function to handle chat creation/retrieval
      const result = await createOrGetChat(user.id, sellerId)
      
      if (result.success && result.chat) {
        console.log("✅ Chat ready, navigating to chat page")
        // Call the parent callback to navigate to chat
        onStartChat?.(sellerId, listingId)
      } else {
        console.error("❌ Failed to create/get chat:", result.error)
        // Could add toast notification here in the future
        alert("Unable to start chat with seller. Please try again.")
      }
    } catch (error) {
      console.error("❌ Unexpected error starting chat:", error)
      alert("An error occurred while starting the chat. Please try again.")
    }
  }

  const handleListingUpdate = () => {
    // Refresh listings when a listing is updated
    loadListings()
  }

  const handleListingDelete = (listingId: string) => {
    // Remove deleted listing from state immediately
    setListings(prev => prev.filter(listing => listing.id !== listingId))
  }

  const activeListingsCount = listings.filter(l => l.status === 'active').length
  const soldListingsCount = listings.filter(l => l.status === 'sold').length

  // Show Add Listing page
  if (currentView === 'add-listing') {
    return (
      <AddListingPage
        user={user}
        onSuccess={() => {
          setCurrentView('marketplace')
          loadListings() // Refresh listings
        }}
        onCancel={() => setCurrentView('marketplace')}
      />
    )
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
                  <h1 className="roomeo-heading text-4xl mb-2">🛍️ Marketplace</h1>
                  <p className="roomeo-body text-emerald-primary/70">Buy and sell furniture for your new place</p>
                  {(activeListingsCount > 0 || soldListingsCount > 0) && (
                    <div className="flex gap-2 mt-3">
                      <Badge className="bg-moss-green text-white roomeo-body font-semibold px-3 py-1">
                        {activeListingsCount} ACTIVE
                      </Badge>
                      {soldListingsCount > 0 && (
                        <Badge className="bg-sage text-emerald-primary roomeo-body font-semibold px-3 py-1">
                          {soldListingsCount} SOLD
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="animate-slide-up">
                  <button
                    onClick={() => setCurrentView('add-listing')}
                    className="roomeo-button-primary flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Sell Item</span>
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-primary/60" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for items..."
                    className="pl-12 pr-4 py-3 roomeo-body border-2 border-sage/30 rounded-xl focus:border-moss-green bg-white h-12"
                  />
                </div>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="roomeo-button-secondary flex items-center justify-center gap-2 h-12 px-6 min-w-[120px]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filters</span>
                </button>

                {/* Sort Dropdown */}
                <select
                  value={`${sortOption.field}-${sortOption.direction}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-') as [string, 'asc' | 'desc']
                    setSortOption({ field: field as any, direction })
                  }}
                  className="roomeo-body border-2 border-sage/30 rounded-xl px-4 py-3 bg-white focus:border-moss-green focus:outline-none h-12 min-w-[180px]"
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="title-asc">Title: A to Z</option>
                </select>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="roomeo-card p-6 mb-6 animate-slide-up">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block roomeo-body font-semibold text-emerald-primary mb-2">Min Price</label>
                      <Input
                        type="number"
                        placeholder="$0"
                        value={filters.minPrice || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          minPrice: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                        className="roomeo-body border-2 border-sage/30 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block roomeo-body font-semibold text-emerald-primary mb-2">Max Price</label>
                      <Input
                        type="number"
                        placeholder="$1000"
                        value={filters.maxPrice || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          maxPrice: e.target.value ? Number(e.target.value) : undefined 
                        }))}
                        className="roomeo-body border-2 border-sage/30 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block roomeo-body font-semibold text-emerald-primary mb-2">Location</label>
                      <Input
                        placeholder="City, State"
                        value={filters.location || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          location: e.target.value || undefined 
                        }))}
                        className="roomeo-body border-2 border-sage/30 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setFilters({})}
                      className="roomeo-button-secondary"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="min-h-[400px]">
                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center animate-fade-in">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-sage/30 border-t-emerald-primary mx-auto mb-6"></div>
                      <p className="roomeo-heading text-xl">Loading listings...</p>
                      <p className="roomeo-body text-emerald-primary/70">Finding great deals for you 🛍️</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center max-w-md animate-fade-in">
                      <AlertCircle className="h-16 w-16 text-alert-red mx-auto mb-4" />
                      <h3 className="roomeo-heading text-xl mb-4">Something went wrong</h3>
                      <p className="roomeo-body text-emerald-primary/70 mb-6">{error}</p>
                      <button
                        onClick={loadListings}
                        className="roomeo-button-primary"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!loading && !error && listings.length === 0 && (
                  <div className="roomeo-card text-center py-16 animate-slide-up">
                    <div className="text-6xl mb-4">🛍️</div>
                    <h3 className="roomeo-heading text-xl mb-2">No listings found</h3>
                    <p className="roomeo-body text-emerald-primary/60 mb-8">
                      {searchQuery || Object.keys(filters).length > 0
                        ? "Try adjusting your search or filters"
                        : "Be the first to add a listing!"}
                    </p>
                    <button
                      onClick={() => setCurrentView('add-listing')}
                      className="roomeo-button-primary"
                    >
                      <span>🎆</span> Add First Listing
                    </button>
                  </div>
                )}

                {/* Listings Grid */}
                {!loading && !error && listings.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listings.map((listing, index) => (
                      <div key={listing.id} className="animate-on-scroll" style={{animationDelay: `${index * 100}ms`}}>
                        <ListingCard
                          listing={listing}
                          currentUser={user}
                          onChatWithSeller={handleChatWithSeller}
                          onUpdate={handleListingUpdate}
                          onDelete={handleListingDelete}
                          showOwnerActions={true}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
