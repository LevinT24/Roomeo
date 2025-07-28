// page.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Users, Rocket, CheckCircle, Mail, Clock, Target, Flame, Instagram } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import AuthPage from "@/components/AuthPage"
import ProfileSetup from "@/components/ProfileSetup"
import UserTypeSelection from "@/components/UserTypeSelection"
import SwipePage from "@/components/SwipePage"
import MatchesPage from "@/components/MatchesPage"
import MarketplacePage from "@/components/MarketplacePage"
import ExpensesPage from "@/components/ExpensesPage"
import ChatPage from "@/components/ChatPage"
import { useState, useEffect } from "react"

export default function Home() {
  const { user, loading, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<
    "landing" | "auth" | "swipe" | "matches" | "marketplace" | 
    "expenses" | "chat" | "profile-setup" | "user-type"
  >("landing")

  // Debug logging
  useEffect(() => {
    console.log("Current user:", user)
    console.log("Loading:", loading)
    console.log("Current page:", currentPage)
  }, [user, loading, currentPage])

  // Handle user authentication state changes
  useEffect(() => {
    if (!loading && user) {
      console.log("User authenticated, checking profile completion...")
      
      // If user is authenticated and we're on landing/auth page, redirect to profile setup
      if (currentPage === "landing" || currentPage === "auth") {
        // Check if user needs to complete profile
        if (!user.age || !user.preferences) {
          console.log("Redirecting to profile setup")
          setCurrentPage("profile-setup")
        } 
        // Check if user needs to select user type
        else if (!user.userType) {
          console.log("Redirecting to user type selection")
          setCurrentPage("user-type")
        }
        // User is fully set up
        else {
          console.log("Redirecting to app")
          setCurrentPage("swipe")
        }
      }
    } else if (!loading && !user) {
      // If user logs out, go back to landing
      if (currentPage !== "landing" && currentPage !== "auth") {
        console.log("User logged out, redirecting to landing...")
        setCurrentPage("landing")
      }
    }
  }, [user, loading, currentPage])

  // Clear localStorage on page load to ensure fresh start
  useEffect(() => {
    // Only clear if we're on landing page and no user is set
    if (currentPage === "landing" && !user && !loading) {
      localStorage.removeItem("mockUser")
    }
  }, [currentPage, user, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#004D40] mx-auto mb-4"></div>
          <p className="text-[#004D40] font-bold">LOADING...</p>
        </div>
      </div>
    )
  }

  // Show auth page if requested
  if (currentPage === "auth") {
    return (
      <AuthPage 
        onBack={() => setCurrentPage("landing")}
        onSuccess={() => {
          // Auth success handled by useEffect above
          console.log("Auth successful - useEffect will handle redirection")
        }}
      />
    )
  }

  // Profile setup page
  if (currentPage === "profile-setup") {
    return (
      <ProfileSetup 
        onComplete={() => {
          console.log("Profile setup complete - redirecting to user type selection")
          setCurrentPage("user-type")
        }} 
      />
    )
  }

  // User type selection page
  if (currentPage === "user-type") {
    return (
      <UserTypeSelection 
        onComplete={() => {
          console.log("User type selection complete - redirecting to app")
          setCurrentPage("swipe")
        }} 
      />
    )
  }

  // If user is authenticated and on app pages, handle app navigation
  if (user && currentPage !== "landing") {
    console.log("User found, showing app page:", currentPage)

    // Navigation component for app pages
    const AppNavigation = () => (
      <div className="fixed bottom-0 left-0 right-0 bg-[#F2F5F1] border-t-4 border-[#004D40] px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => setCurrentPage("swipe")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors font-black ${
              currentPage === "swipe" ? "text-[#004D40] bg-[#44C76F]/20" : "text-[#004D40]"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="text-xs font-black">DISCOVER</span>
          </button>
          <button
            onClick={() => setCurrentPage("matches")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors font-black ${
              currentPage === "matches" ? "text-[#004D40] bg-[#44C76F]/20" : "text-[#004D40]"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-xs font-black">MATCHES</span>
          </button>
          <button
            onClick={() => setCurrentPage("chat")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors font-black ${
              currentPage === "chat" ? "text-[#004D40] bg-[#44C76F]/20" : "text-[#004D40]"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs font-black">CHAT</span>
          </button>
          <button
            onClick={() => setCurrentPage("marketplace")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors font-black ${
              currentPage === "marketplace" ? "text-[#004D40] bg-[#44C76F]/20" : "text-[#004D40]"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span className="text-xs font-black">MARKET</span>
          </button>
          <button
            onClick={() => setCurrentPage("expenses")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors font-black ${
              currentPage === "expenses" ? "text-[#004D40] bg-[#44C76F]/20" : "text-[#004D40]"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
            <span className="text-xs font-black">EXPENSES</span>
          </button>
        </div>
      </div>
    )

    return (
      <div className="min-h-screen bg-[#F2F5F1]">
         {currentPage === "swipe" && <SwipePage user={user as any} />}
        {currentPage === "matches" && <MatchesPage user={user as any} />}
        {currentPage === "marketplace" && <MarketplacePage user={user as any} />}
        {currentPage === "expenses" && <ExpensesPage user={user as any} />}
        {currentPage === "chat" && <ChatPage user={user as any} onBack={() => setCurrentPage("matches")} />}

        <AppNavigation />
      </div>
    )
  }

  // Handle authenticated user wanting to go to app
  const handleGoToApp = () => {
    if (user) {
      // User is authenticated, go to app
      setCurrentPage("swipe")
    } else {
      // No user, go to auth
      setCurrentPage("auth")
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      setCurrentPage("landing")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Show landing page by default
  console.log("Showing landing page")
  return (
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
          <Link
            href="#features"
            className="text-lg font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors border-b-2 border-transparent hover:border-[#44C76F] pb-1"
          >
            FEATURES
          </Link>
          <Link
            href="#how-it-works"
            className="text-lg font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors border-b-2 border-transparent hover:border-[#44C76F] pb-1"
          >
            HOW IT WORKS
          </Link>
          <Link
            href="#contact"
            className="text-lg font-black text-[#F2F5F1] hover:text-[#44C76F] transition-colors border-b-2 border-transparent hover:border-[#44C76F] pb-1"
          >
            CONTACT
          </Link>

          {/* Show user controls if logged in */}
          {user && (
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
                  {user ? "GO TO APP" : "GET STARTED NOW"}
                  <Target className="ml-3 h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentPage("auth")}
                  className="border-4 border-[#44C76F] text-[#44C76F] hover:bg-[#44C76F] hover:text-[#004D40] font-black text-xl px-12 py-6 shadow-[8px_8px_0px_0px_#44C76F] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#44C76F] transition-all bg-transparent"
                >
                  SIGN UP FREE
                </Button>
              </div>
            </div>
          </div>
        </section>

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
  )
}