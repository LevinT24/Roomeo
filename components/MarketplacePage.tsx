"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, SlidersHorizontal, Plus, Loader2, AlertCircle } from "lucide-react"
import ListingCard from "@/components/ListingCard"
import AddListingPage from "@/components/AddListingPage"
import { getListings } from "@/services/marketplace"
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
  const loadListings = async () => {
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
  }

  // Load listings on mount and when filters/sort change
  useEffect(() => {
    loadListings()
  }, [filters, sortOption])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadListings()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleChatWithSeller = (sellerId: string, listingId: string) => {
    console.log("🔄 Starting chat with seller:", sellerId, "for listing:", listingId)
    onStartChat?.(sellerId, listingId)
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
    <div className="min-h-screen bg-[#F2F5F1] pt-20 pb-20">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-[#004D40] mb-2 transform -skew-x-2">
                MARKETPLACE
              </h1>
              <div className="w-20 h-2 bg-[#44C76F] transform skew-x-12"></div>
              {(activeListingsCount > 0 || soldListingsCount > 0) && (
                <div className="flex gap-2 mt-3">
                  <Badge className="bg-[#44C76F] text-[#004D40] font-black border-2 border-[#004D40]">
                    {activeListingsCount} ACTIVE
                  </Badge>
                  {soldListingsCount > 0 && (
                    <Badge className="bg-gray-500 text-white font-black border-2 border-gray-700">
                      {soldListingsCount} SOLD
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <Button
              onClick={() => setCurrentView('add-listing')}
              className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black px-6 py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" />
              SELL ITEM
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#004D40]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for items..."
                className="pl-10 border-2 border-[#004D40] font-bold focus:border-[#44C76F]"
              />
            </div>

            {/* Filter Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#44C76F]/20 font-black px-4"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              FILTERS
            </Button>

            {/* Sort Dropdown */}
            <select
              value={`${sortOption.field}-${sortOption.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-') as [string, 'asc' | 'desc']
                setSortOption({ field: field as any, direction })
              }}
              className="border-2 border-[#004D40] rounded-lg px-3 py-2 font-bold bg-[#F2F5F1] focus:border-[#44C76F] focus:outline-none"
            >
              <option value="created_at-desc">NEWEST FIRST</option>
              <option value="created_at-asc">OLDEST FIRST</option>
              <option value="price-asc">PRICE: LOW TO HIGH</option>
              <option value="price-desc">PRICE: HIGH TO LOW</option>
              <option value="title-asc">TITLE: A TO Z</option>
            </select>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 border-2 border-[#004D40] rounded-lg bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-1">MIN PRICE</label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minPrice: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="border-2 border-[#004D40] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-1">MAX PRICE</label>
                  <Input
                    type="number"
                    placeholder="$1000"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxPrice: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="border-2 border-[#004D40] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-1">LOCATION</label>
                  <Input
                    placeholder="City, State"
                    value={filters.location || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      location: e.target.value || undefined 
                    }))}
                    className="border-2 border-[#004D40] font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => setFilters({})}
                  variant="outline"
                  className="border-2 border-[#004D40] text-[#004D40] font-black"
                >
                  CLEAR FILTERS
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#44C76F] mx-auto mb-4" />
                <p className="font-black text-[#004D40]">LOADING LISTINGS...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="font-black text-red-600 mb-4">{error}</p>
                <Button
                  onClick={loadListings}
                  className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40]"
                >
                  TRY AGAIN
                </Button>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && listings.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-200 border-4 border-[#004D40] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="font-black text-[#004D40] text-xl mb-2">NO LISTINGS FOUND</h3>
                <p className="text-gray-600 font-bold mb-4">
                  {searchQuery || Object.keys(filters).length > 0
                    ? "Try adjusting your search or filters"
                    : "Be the first to add a listing!"}
                </p>
                <Button
                  onClick={() => setCurrentView('add-listing')}
                  className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40]"
                >
                  ADD FIRST LISTING
                </Button>
              </div>
            </div>
          )}

          {/* Listings Grid */}
          {!loading && !error && listings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  currentUser={user}
                  onChatWithSeller={handleChatWithSeller}
                  onUpdate={handleListingUpdate}
                  onDelete={handleListingDelete}
                  showOwnerActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
