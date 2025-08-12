// app/page.tsx - Updated with stable session management
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Zap, Users, Rocket, CheckCircle, Mail, Clock, Target, Flame, Instagram, X } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { updateUserProfile } from "@/services/supabase"
import AuthPage from "@/components/AuthPage"
import ProfileSetup from "@/components/ProfileSetup"
import UserTypeSelection from "@/components/UserTypeSelection"
import SwipePage from "@/components/SwipePage"
import MatchesPage from "@/components/MatchesPage"
import MarketplacePage from "@/components/MarketplacePage"
import ExpensesPage from "@/components/ExpensesPage"  
import ChatPage from "@/components/ChatPage"
import SettingsMenu from "@/components/SettingsMenu"
import ProfilePreview from "@/components/ProfilePreview"
import SessionRecovery from "@/components/SessionRecovery"
import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/LoadingSpinner"
import ErrorBoundary from "@/components/ErrorBoundary"
import DebugInfo from "@/components/DebugInfo"
import { FriendsPanel, FriendsPanelToggle } from "@/components/friends"

export default function Home() {
  const { user, loading, logout, error: authError, sessionValid } = useAuth()
  const [currentPage, setCurrentPage] = useState<
    "landing" | "auth" | "swipe" | "matches" | "marketplace" | 
    "expenses" | "chat" | "profile-setup" | "user-type" | "profile-preview"
  >("landing")
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup")
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false)
  const [chatTarget, setChatTarget] = useState<{sellerId: string, listingId?: string} | null>(null)
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [showUpdateAccount, setShowUpdateAccount] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateData, setUpdateData] = useState({
    name: "",
    age: "",
    bio: "",
    location: "",
    budget: ""
  })

  // Debug logging
  useEffect(() => {
    console.log("🔍 App State:", {
      user: user ? { 
        id: user.id, 
        name: user.name, 
        age: user.age, 
        userType: user.userType, 
        preferences: !!user.preferences 
      } : null,
      loading,
      currentPage,
      authError,
      sessionValid
    });
  }, [user, loading, currentPage, authError, sessionValid]);

  // Handle user authentication state and profile completion
  useEffect(() => {
    console.log("🔄 Checking user flow...", { 
      user: !!user, 
      loading, 
      currentPage, 
      authError, 
      sessionValid 
    });

    if (user && sessionValid) {
      console.log("✅ User is authenticated with valid session");
      
      // Only redirect if we're on landing or auth pages
      if (currentPage === "landing" || currentPage === "auth") {
        console.log("🔍 Checking profile completion...");
        
        // Check if profile setup is needed (age, preferences, AND userType are required)
        if (!user.age || !user.preferences || !user.userType) {
          console.log("🔄 Profile setup needed - redirecting to profile setup");
          console.log("   - Missing age:", !user.age);
          console.log("   - Missing preferences:", !user.preferences);
          console.log("   - Missing userType:", !user.userType);
          setCurrentPage("profile-setup");
          return;
        }
        
        // User is fully set up - go to main app
        console.log("✅ User fully set up - redirecting to main app");
        setCurrentPage("swipe");
      }
    } else if (!loading && !authError && !user) {
      console.log("❌ No user and not loading - checking if we need to redirect to landing");
      // If user logs out or is not authenticated, go back to landing
      if (currentPage !== "landing" && currentPage !== "auth") {
        console.log("🔄 Redirecting to landing page");
        setCurrentPage("landing");
      }
    }
  }, [user, loading, currentPage, authError, sessionValid]);

  // Initialize update data when user changes
  useEffect(() => {
    if (user) {
      setUpdateData({
        name: user.name || "",
        age: user.age || "",
        bio: user.bio || "",
        location: user.location || "",
        budget: user.budget || ""
      })
    }
  }, [user])

  const handleUpdateAccount = async () => {
    if (!user?.id) {
      console.error("No user ID available for update")
      alert("Error: No user information available. Please sign in again.")
      return
    }
    
    setIsUpdating(true)
    try {
      console.log("🔄 Starting account update for user:", user.id)
      console.log("🔄 Update data:", updateData)
      
      // Validate required fields
      if (!updateData.name?.trim()) {
        alert("Name is required")
        setIsUpdating(false)
        return
      }
      
      // Parse numbers safely
      const ageValue = updateData.age ? parseInt(updateData.age.toString()) : null
      const budgetValue = updateData.budget ? parseInt(updateData.budget.toString()) : null
      
      // Check if parsed numbers are valid
      if (updateData.age && (ageValue === null || isNaN(ageValue))) {
        alert("Please enter a valid age")
        setIsUpdating(false)
        return
      }
      
      if (updateData.budget && (budgetValue === null || isNaN(budgetValue))) {
        alert("Please enter a valid budget")
        setIsUpdating(false)
        return
      }
      
      const updatePayload = {
        name: updateData.name.trim(),
        age: ageValue,
        bio: updateData.bio?.trim() || "",
        location: updateData.location?.trim() || "",
        budget: budgetValue
      }
      
      console.log("🔄 Final update payload:", updatePayload)
      
      const success = await updateUserProfile(user.id, updatePayload)
      
      if (success) {
        console.log("✅ Account update successful")
        alert("Account updated successfully!")
        setShowUpdateAccount(false)
        setShowUserSettings(false)
        // Refresh the page to reflect changes
        window.location.reload()
      } else {
        console.error("❌ Account update failed - updateUserProfile returned false")
        alert("Failed to update account. Please check the console for details and try again.")
      }
    } catch (error) {
      console.error("❌ Exception during account update:", error)
      alert(`Failed to update account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  // Show loading screen with timeout
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("⚠️ Main page loading timeout reached, allowing fallback...");
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout for main page
    
    return () => clearTimeout(timer);
  }, [loading]);
  
  // Show loading screen but allow user to proceed if they exist
  if (loading && !loadingTimeout && !user && !authError) {
    return <LoadingSpinner />;
  }

  // Show configuration error if exists
  if (authError) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-4 border-red-500 shadow-[8px_8px_0px_0px_red] bg-red-100">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500 border-4 border-red-700 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-black text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-black text-red-700 mb-4">CONFIGURATION ERROR</h2>
            <p className="text-red-700 font-bold mb-6">{authError}</p>
            <div className="text-sm text-red-600 text-left bg-red-50 p-4 border-2 border-red-200">
              <p className="font-bold mb-2">Required in .env.local:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
            <Button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              RELOAD PAGE
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session recovery overlay
  const SessionRecoveryOverlay = () => (
    user && !sessionValid ? (
      <SessionRecovery 
        onRecovered={() => {
          console.log("✅ Session recovered, continuing with app");
        }}
      />
    ) : null
  );

  // Show auth page
  if (currentPage === "auth") {
    return (
      <>
        <AuthPage 
          initialMode={authMode}
          onBack={() => setCurrentPage("landing")}
          onSuccess={() => {
            console.log("✅ Auth successful - useEffect will handle redirection");
          }}
        />
        <SessionRecoveryOverlay />
      </>
    );
  }

  // Show profile setup page
  if (currentPage === "profile-setup") {
    return (
      <>
        <ProfileSetup 
          onComplete={() => {
            console.log("✅ Profile setup complete - going to main app");
            setCurrentPage("swipe");
          }} 
        />
        <SessionRecoveryOverlay />
      </>
    );
  }

  // Show user type selection page
  if (currentPage === "user-type") {
    return (
      <>
        <UserTypeSelection 
          onComplete={() => {
            console.log("✅ User type selection complete - going to main app");
            setCurrentPage("swipe");
          }} 
        />
        <SessionRecoveryOverlay />
      </>
    );
  }

  // Show profile preview page
  if (currentPage === "profile-preview") {
    return (
      <>
        <ProfilePreview 
          user={user as any}
          onBack={() => setCurrentPage("swipe")}
        />
        <SessionRecoveryOverlay />
      </>
    );
  }

  // Show app pages for authenticated users
  if (user && currentPage !== "landing") {
    console.log("📱 Showing app page:", currentPage);

    const AppNavigation = () => (
      <div className="fixed bottom-0 left-0 right-0 bg-[#F2F5F1] border-t-4 border-[#004D40] px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { page: "swipe", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", label: "DISCOVER" },
            { page: "matches", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", label: "MATCHES" },
            { page: "chat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "CHAT" },
            { page: "marketplace", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z", label: "MARKET" },
            { page: "expenses", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1", label: "EXPENSES" }
          ].map(({ page, icon, label }) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page as any)}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors font-black ${
                currentPage === page ? "text-[#004D40] bg-[#44C76F]/20" : "text-[#004D40]"
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={icon} />
              </svg>
              <span className="text-xs font-black">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#F2F5F1]">
          {/* Settings Header */}
          <div className="fixed top-0 left-0 right-0 bg-[#F2F5F1] border-b-4 border-[#004D40] px-4 py-3 z-40">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#44C76F] border-2 border-[#004D40] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#004D40]">
                  <span className="text-[#004D40] font-black text-sm transform -rotate-3">R</span>
                </div>
                <span className="font-black text-lg tracking-tight transform -skew-x-6 text-[#004D40]">ROOMIO</span>
              </div>
              <div className="flex items-center space-x-3">
                {/* Session status indicator */}
                <div className={`w-3 h-3 rounded-full ${sessionValid ? 'bg-green-500' : 'bg-orange-500'}`} 
                     title={sessionValid ? 'Session active' : 'Session recovering'} />
                
                {/* Filter Button - Only show on swipe page */}
                {currentPage === "swipe" && (
                  <button 
                    className="text-[#004D40] hover:text-[#44C76F] focus:outline-none" 
                    title="Filter matches"
                    onClick={() => {
                      const filterButton = document.querySelector('[data-filter-trigger]') as HTMLButtonElement;
                      if (filterButton) filterButton.click();
                    }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
                      />
                    </svg>
                  </button>
                )}
                
                {/* Profile Picture with Settings Dropdown */}
                <div className="relative">
                  <img
                    alt="User Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#44C76F] cursor-pointer hover:border-[#004D40] transition-colors"
                    src={user?.profilePicture || "/placeholder.svg?height=40&width=40"}
                    title="Profile Menu"
                    onClick={() => setShowUserSettings(!showUserSettings)}
                  />
                  
                  {/* Settings Dropdown */}
                  {showUserSettings && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowUserSettings(false)}
                      />
                      
                      {/* Settings Menu */}
                      <div className="absolute right-0 top-12 bg-[#F2F5F1] border-4 border-[#004D40] rounded-lg shadow-[6px_6px_0px_0px_#004D40] z-50 min-w-56">
                        <div className="py-2">
                          {/* User Info Header */}
                          <div className="px-4 py-2 border-b-2 border-[#004D40]">
                            <p className="font-black text-[#004D40] text-sm whitespace-nowrap">{user?.name || "User"}</p>
                            <p className="font-bold text-[#44C76F] text-xs truncate">{user?.email}</p>
                          </div>
                          
                          {/* Menu Items */}
                          <button
                            onClick={() => {
                              setCurrentPage("profile-preview")
                              setShowUserSettings(false)
                            }}
                            className="w-full px-4 py-2 text-left font-black text-[#004D40] hover:bg-[#44C76F] hover:text-[#004D40] transition-colors flex items-center gap-3 whitespace-nowrap"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm">VIEW PROFILE</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowUpdateAccount(true)
                              setShowUserSettings(false)
                            }}
                            className="w-full px-4 py-2 text-left font-black text-[#004D40] hover:bg-[#44C76F] hover:text-[#004D40] transition-colors flex items-center gap-3 whitespace-nowrap"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-sm">EDIT PROFILE</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              // Add account settings functionality here
                              setShowUserSettings(false)
                            }}
                            className="w-full px-4 py-2 text-left font-black text-[#004D40] hover:bg-[#44C76F] hover:text-[#004D40] transition-colors flex items-center gap-3 whitespace-nowrap"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm">SETTINGS</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              // Add help/support functionality here
                              setShowUserSettings(false)
                            }}
                            className="w-full px-4 py-2 text-left font-black text-[#004D40] hover:bg-[#44C76F] hover:text-[#004D40] transition-colors flex items-center gap-3 whitespace-nowrap"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm">HELP</span>
                          </button>
                          
                          <div className="border-t-2 border-[#004D40] mt-1 pt-1">
                            <button
                              onClick={async () => {
                                try {
                                  console.log("🔄 Starting logout process...")
                                  setShowUserSettings(false)
                                  
                                  // Call logout function which will handle auth cleanup
                                  await logout()
                                  
                                  console.log("✅ Logout successful, redirecting to landing...")
                                  setCurrentPage("landing")
                                  
                                  // Force a page reload to ensure clean state
                                  setTimeout(() => {
                                    window.location.href = "/"
                                  }, 100)
                                  
                                } catch (error) {
                                  console.error("❌ Logout error:", error)
                                  alert(`Failed to sign out: ${error instanceof Error ? error.message : 'Unknown error'}`)
                                }
                              }}
                              className="w-full px-4 py-2 text-left font-black text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 whitespace-nowrap"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              <span className="text-sm">LOGOUT</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content with top padding */}
          <div className={`pt-20 transition-all duration-300 ${
            friendsPanelOpen && ['chat', 'marketplace', 'expenses'].includes(currentPage) 
              ? 'pr-80' : ''
          }`}>
            {currentPage === "swipe" && <SwipePage user={user as any} />}
            {currentPage === "matches" && (
              <MatchesPage 
                user={user as any} 
                onStartChat={(matchUserId, matchUserName) => {
                  console.log(`Starting chat with ${matchUserName} (${matchUserId})`)
                  setChatTarget({ sellerId: matchUserId })
                  setCurrentPage("chat")
                }}
              />
            )}
            {currentPage === "marketplace" && (
              <MarketplacePage 
                user={user as any}
                onStartChat={(sellerId, listingId) => {
                  console.log(`Starting chat with seller ${sellerId} for listing ${listingId}`)
                  setChatTarget({ sellerId, listingId })
                  setCurrentPage("chat")
                }}
              />
            )}
            {currentPage === "expenses" && <ExpensesPage user={user as any} />}
            {currentPage === "chat" && (
              <ChatPage 
                user={user as any} 
                chatTarget={chatTarget}
                onBack={() => {
                  const wasFromMarketplace = chatTarget?.listingId
                  setChatTarget(null)
                  setCurrentPage(wasFromMarketplace ? "marketplace" : "matches")
                }} 
              />
            )}
          </div>

          {/* Friends Panel - Only show on specific pages */}
          <FriendsPanelToggle
            isOpen={friendsPanelOpen}
            onToggle={() => setFriendsPanelOpen(!friendsPanelOpen)}
            show={['chat', 'marketplace', 'expenses'].includes(currentPage)}
          />

          <FriendsPanel
            isOpen={friendsPanelOpen}
            onClose={() => setFriendsPanelOpen(false)}
            user={user as any}
          />

          <AppNavigation />
          <SessionRecoveryOverlay />
          <DebugInfo />
          
          {/* Update Account Modal */}
          {showUpdateAccount && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-[#004D40]">UPDATE ACCOUNT</h2>
                    <Button
                      onClick={() => setShowUpdateAccount(false)}
                      variant="outline"
                      size="sm"
                      className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">NAME</label>
                      <Input
                        value={updateData.name}
                        onChange={(e) => setUpdateData({ ...updateData, name: e.target.value })}
                        className="border-2 border-[#004D40] font-bold"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">AGE</label>
                      <Input
                        type="number"
                        value={updateData.age}
                        onChange={(e) => setUpdateData({ ...updateData, age: e.target.value })}
                        className="border-2 border-[#004D40] font-bold"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">BIO</label>
                      <Input
                        value={updateData.bio}
                        onChange={(e) => setUpdateData({ ...updateData, bio: e.target.value })}
                        className="border-2 border-[#004D40] font-bold"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">LOCATION</label>
                      <Input
                        value={updateData.location}
                        onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })}
                        className="border-2 border-[#004D40] font-bold"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-black text-[#004D40] mb-2">BUDGET ($)</label>
                      <Input
                        type="number"
                        value={updateData.budget}
                        onChange={(e) => setUpdateData({ ...updateData, budget: e.target.value })}
                        className="border-2 border-[#004D40] font-bold"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleUpdateAccount}
                      disabled={isUpdating}
                      className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                    >
                      {isUpdating ? "UPDATING..." : "UPDATE"}
                    </Button>
                    <Button
                      onClick={() => setShowUpdateAccount(false)}
                      variant="outline"
                      className="flex-1 border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black"
                    >
                      CANCEL
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ErrorBoundary>
    );
  }

  // Handle navigation for landing page
  const handleGoToApp = () => {
    if (user && sessionValid) {
      // User is authenticated, determine where to go
      if (!user.age || !user.preferences || !user.userType) {
        setCurrentPage("profile-setup");
      } else {
        setCurrentPage("swipe");
      }
    } else {
      // No user, go to auth
      setCurrentPage("auth");
    }
  };

  const handleLogout = async () => {
    try {
      console.log("🔄 Starting logout process from landing page...")
      await logout();
      setCurrentPage("landing");
      
      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.href = "/"
      }, 100)
      
    } catch (error) {
      console.error("❌ Logout error:", error);
      alert(`Failed to sign out: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  };

  // Show landing page
  console.log("🏠 Showing landing page");
  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[#F2F5F1] text-[#004D40]">
      {/* Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center border-b-4 border-[#004D40] bg-[#004D40]">
        <button onClick={() => setCurrentPage("landing")} className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#44C76F] border-4 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[4px_4px_0px_0px_#F2F5F1]">
              <span className="text-[#004D40] font-black text-xl transform -rotate-3">R</span>
            </div>
            <span className="font-black text-2xl tracking-tight transform -skew-x-6 text-[#F2F5F1]">ROOMIO</span>
          </div>
        </button>
        <nav className="ml-auto flex gap-8 items-center">
          <Link href="#features" className="text-lg font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors border-b-2 border-transparent hover:border-[#44C76F] pb-1">
            FEATURES
          </Link>
          <Link href="#how-it-works" className="text-lg font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors border-b-2 border-transparent hover:border-[#44C76F] pb-1">
            HOW IT WORKS
          </Link>
          <Link href="#contact" className="text-lg font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors border-b-2 border-transparent hover:border-[#44C76F] pb-1">
            CONTACT
          </Link>

          {user && sessionValid && (
            <div className="flex items-center gap-4">
              <Button
                onClick={handleGoToApp}
                className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black px-6 py-3 border-4 border-[#F2F5F1] shadow-[4px_4px_0px_0px_#F2F5F1] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#F2F5F1] transition-all"
              >
                GO TO APP
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-4 border-[#F2F5F1] text-[#F2F5F1] hover:bg-[#F2F5F1] hover:text-[#004D40] font-black px-6 py-3 shadow-[4px_4px_0px_0px_#F2F5F1] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#F2F5F1] transition-all bg-transparent"
              >
                LOGOUT
              </Button>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-20 lg:py-24 bg-[#004D40] text-[#F2F5F1] relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,199,111,0.1)_25%,rgba(68,199,111,0.1)_50%,transparent_50%,transparent_75%,rgba(68,199,111,0.1)_75%)] bg-[length:20px_20px]"></div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-6">
                <div className="inline-block">
                  <Badge className="mb-6 bg-[#D4AF37] text-[#004D40] font-black text-lg px-6 py-3 border-4 border-[#F2F5F1] shadow-[6px_6px_0px_0px_#F2F5F1] transform rotate-1">
                    <Flame className="w-5 h-5 mr-2" />
                    NO BULLSH*T. NO FAKE PROFILES.
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none">
                  <span className="block transform -skew-y-1">FIND YOUR</span>
                  <span className="block text-[#44C76F] transform skew-y-1">PERFECT</span>
                  <span className="block transform -skew-y-1">ROOMMATE</span>
                  <span className="block text-[#44C76F] transform skew-y-1">TODAY</span>
                </h1>
                <div className="max-w-4xl mx-auto">
                  <p className="text-xl md:text-2xl font-bold text-[#B7C8B5] leading-tight border-l-8 border-[#44C76F] pl-6 text-left">
                    SWIPE, MATCH, AND MOVE IN WITH COMPATIBLE ROOMMATES. SPLIT EXPENSES, SHARE FURNITURE, AND BUILD YOUR
                    PERFECT LIVING SPACE.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                <Button
                  size="lg"
                  onClick={handleGoToApp}
                  className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black text-xl px-12 py-6 border-4 border-[#F2F5F1] shadow-[8px_8px_0px_0px_#F2F5F1] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#F2F5F1] transition-all"
                >
                  {user && sessionValid ? "GO TO APP" : "GET STARTED NOW"}
                  <Target className="ml-3 h-6 w-6" />
                </Button>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setCurrentPage("auth");
                      setAuthMode("signup");
                    }}
                    className="border-4 border-[#44C76F] text-[#44C76F] hover:bg-[#44C76F] hover:text-[#004D40] font-black text-xl px-8 py-6 shadow-[8px_8px_0px_0px_#44C76F] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#44C76F] transition-all bg-transparent"
                  >
                    SIGN UP FREE
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setCurrentPage("auth");
                      setAuthMode("signin");
                    }}
                    className="border-4 border-[#F2F5F1] text-[#F2F5F1] hover:bg-[#F2F5F1] hover:text-[#004D40] font-black text-xl px-8 py-6 shadow-[8px_8px_0px_0px_#F2F5F1] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#F2F5F1] transition-all bg-transparent"
                  >
                    SIGN IN
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rest of landing page content remains the same... */}
        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-20 bg-[#44C76F] text-[#004D40]">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none transform -skew-x-3">
                    WHY ROOMIO DOMINATES
                  </h2>
                  <div className="w-32 h-2 bg-[#004D40] transform skew-x-12"></div>
                  <p className="text-xl md:text-2xl font-bold leading-tight">
                    FINDING THE PERFECT ROOMMATE SHOULDN'T BE A NIGHTMARE. WE MAKE IT SIMPLE, SAFE, AND ACTUALLY FUN.
                  </p>
                </div>
                <div className="grid gap-4">
                  {[
                    "TINDER-STYLE MATCHING FOR COMPATIBLE ROOMMATES",
                    "BUILT-IN EXPENSE SPLITTING LIKE SPLITWISE",
                    "MARKETPLACE FOR FURNITURE & HOUSEHOLD ITEMS",
                    "VERIFIED PROFILES FOR SAFETY & TRUST",
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 bg-[#F2F5F1] text-[#004D40] p-4 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
                    >
                      <CheckCircle className="h-8 w-8 text-[#44C76F] flex-shrink-0" />
                      <span className="font-black text-lg">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Users, title: "SMART MATCHING", desc: "FIND COMPATIBLE ROOMMATES", color: "bg-[#F2F5F1]" },
                  { icon: Zap, title: "EXPENSE SPLITTING", desc: "TRACK SHARED COSTS", color: "bg-[#004D40]" },
                  { icon: Rocket, title: "MARKETPLACE", desc: "BUY & SELL FURNITURE", color: "bg-[#004D40]" },
                  { icon: Clock, title: "INSTANT CHAT", desc: "CONNECT IMMEDIATELY", color: "bg-[#F2F5F1]" },
                ].map((item, index) => (
                  <Card
                    key={index}
                    className={`${item.color} ${item.color === "bg-[#004D40]" ? "text-[#F2F5F1] border-[#F2F5F1]" : "text-[#004D40] border-[#004D40]"} border-4 shadow-[6px_6px_0px_0px_${item.color === "bg-[#004D40]" ? "#F2F5F1" : "#004D40"}] transform hover:translate-x-1 hover:translate-y-1 transition-all`}
                  >
                    <CardContent className="p-6 text-center">
                      <item.icon
                        className={`h-12 w-12 mx-auto mb-4 ${item.color === "bg-[#004D40]" ? "text-[#44C76F]" : "text-[#44C76F]"}`}
                      />
                      <h3 className="font-black text-lg mb-2">{item.title}</h3>
                      <p className="font-bold text-sm">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-20 bg-[#B7C8B5] text-[#004D40]">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 transform skew-x-2">HOW IT WORKS</h2>
              <div className="w-48 h-3 bg-[#004D40] mx-auto transform -skew-x-12 mb-6"></div>
              <p className="text-xl md:text-2xl font-bold text-[#004D40] max-w-4xl mx-auto">
                FROM SWIPING TO MOVING IN - THE SIMPLEST WAY TO FIND YOUR ROOMMATE
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "CREATE PROFILE",
                  desc: "UPLOAD PHOTOS, SET PREFERENCES, AND TELL US WHAT YOU'RE LOOKING FOR IN A ROOMMATE.",
                },
                {
                  step: "02",
                  title: "SWIPE & MATCH",
                  desc: "BROWSE POTENTIAL ROOMMATES AND SWIPE RIGHT ON PEOPLE YOU'D LIKE TO LIVE WITH.",
                },
                {
                  step: "03",
                  title: "CHAT & MEET",
                  desc: "WHEN YOU BOTH SWIPE RIGHT, START CHATTING AND ARRANGE TO MEET IN PERSON.",
                },
                {
                  step: "04",
                  title: "MOVE IN TOGETHER",
                  desc: "SPLIT EXPENSES, SHARE FURNITURE, AND ENJOY YOUR NEW LIVING ARRANGEMENT.",
                },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-24 h-24 bg-[#D4AF37] border-4 border-[#004D40] flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-[6px_6px_0px_0px_#004D40]">
                    <span className="text-[#004D40] font-black text-2xl transform -rotate-3">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-black mb-4 transform -skew-x-1">{item.title}</h3>
                  <p className="font-bold text-[#004D40] leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-20 bg-[#F2F5F1] relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(68,199,111,0.1)_25%,rgba(68,199,111,0.1)_50%,transparent_50%,transparent_75%,rgba(68,199,111,0.1)_75%)] bg-[length:40px_40px]"></div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="text-center space-y-8">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none text-[#004D40]">
                  <span className="block transform skew-x-2">READY TO FIND</span>
                  <span className="block text-[#44C76F] transform -skew-x-2">YOUR ROOMMATE?</span>
                </h2>
                <div className="w-32 h-3 bg-[#44C76F] mx-auto transform -skew-x-12"></div>
                <p className="text-xl md:text-2xl font-bold max-w-3xl mx-auto">
                  HAVE QUESTIONS? NEED HELP? WE'RE HERE TO MAKE YOUR ROOMMATE SEARCH AS SMOOTH AS POSSIBLE.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
                <div className="inline-flex items-center gap-4 bg-[#F2F5F1] text-[#004D40] px-8 py-6 border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] transform hover:translate-x-2 hover:translate-y-2 hover:shadow-[4px_4px_0px_0px_#44C76F] transition-all">
                  <Mail className="h-8 w-8 text-[#44C76F]" />
                  <Link
                    href="mailto:hello@roomio.com"
                    className="font-black text-2xl hover:text-[#44C76F] transition-colors"
                  >
                    HELLO@ROOMIO.COM
                  </Link>
                </div>
                <div className="inline-flex items-center gap-4 bg-[#F2F5F1] text-[#004D40] px-8 py-6 border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] transform hover:translate-x-2 hover:translate-y-2 hover:shadow-[4px_4px_0px_0px_#44C76F] transition-all">
                  <Instagram className="h-8 w-8 text-[#44C76F]" />
                  <Link
                    href="https://www.instagram.com/roomio.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black text-2xl hover:text-[#44C76F] transition-colors"
                  >
                    @ROOMIO.APP
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#004D40] border-t-4 border-[#44C76F] py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-black text-[#F2F5F1]">© {new Date().getFullYear()} ROOMIO. ALL RIGHTS RESERVED.</p>
            <nav className="flex gap-8">
              <Link
                href="https://www.instagram.com/roomio.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors flex items-center gap-2"
              >
                <Instagram className="h-5 w-5" />
                INSTAGRAM
              </Link>
              <Link href="#" className="font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors">
                PRIVACY POLICY
              </Link>
              <Link href="#" className="font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors">
                TERMS OF SERVICE
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
    <SessionRecoveryOverlay />
    <DebugInfo />
  </ErrorBoundary>
  );
}