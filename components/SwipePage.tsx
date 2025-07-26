"use client"

import { useState } from "react"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
  age?: number
  preferences?: {
    smoking: boolean
    drinking: boolean
    vegetarian: boolean
    pets: boolean
  }
  userType?: "owner" | "seeker"
}

interface SwipePageProps {
  user: User
}

export default function SwipePage({ user }: SwipePageProps) {
  const [profiles] = useState([
    {
      id: "1",
      name: "Sophia Clark",
      age: 28,
      profilePicture: "/placeholder.svg?height=400&width=400&text=Sophia",
      userType: "owner",
      preferences: { smoking: false, drinking: true, vegetarian: false, pets: true },
      bio: "I'm a creative professional looking for a roommate who appreciates a clean and organized living space.",
    },
    {
      id: "2",
      name: "Marcus Johnson",
      age: 26,
      profilePicture: "/placeholder.svg?height=400&width=400&text=Marcus",
      userType: "owner",
      preferences: { smoking: false, drinking: false, vegetarian: true, pets: false },
      bio: "Software engineer who loves cooking and quiet evenings. Looking for a responsible roommate.",
    },
    {
      id: "3",
      name: "Emma Rodriguez",
      age: 24,
      profilePicture: "/placeholder.svg?height=400&width=400&text=Emma",
      userType: "owner",
      preferences: { smoking: false, drinking: true, vegetarian: false, pets: true },
      bio: "Graduate student seeking a friendly roommate to share a cozy apartment near campus.",
    },
  ])
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleSwipe = (liked: boolean) => {
    console.log(liked ? "Liked!" : "Passed!")
    setCurrentIndex((prev) => prev + 1)
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-black text-[#004D40] mb-4 transform -skew-x-2">NO MORE PROFILES</h2>
          <p className="text-xl font-bold text-[#004D40]">CHECK BACK LATER FOR NEW MATCHES!</p>
          <div className="w-24 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mt-4"></div>
        </div>
      </div>
    )
  }

  const currentProfile = profiles[currentIndex]

  return (
    <div className="bg-[#F2F5F1] text-[#004D40] min-h-screen">
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-[#004D40] border-b-4 border-[#44C76F] sticky top-0 z-10">
          <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#44C76F] border-2 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#F2F5F1]">
                <span className="text-[#004D40] font-black text-sm transform -rotate-3">R</span>
              </div>
              <h1 className="text-2xl font-black text-[#F2F5F1] transform -skew-x-3">ROOMIO</h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                FIND ROOMMATES
              </a>
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                MY MATCHES
              </a>
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                EXPENSES
              </a>
              <a
                className="text-[#F2F5F1] hover:text-[#44C76F] font-black border-b-2 border-transparent hover:border-[#44C76F] pb-1"
                href="#"
              >
                MARKETPLACE
              </a>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-[#F2F5F1] hover:text-[#44C76F] focus:outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              <img
                alt="User Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#44C76F]"
                src={user?.profilePicture || "/placeholder.svg?height=40&width=40"}
              />
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center p-4 bg-[#F2F5F1] min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center min-h-[calc(100vh-160px)]">
            <div className="relative mb-8">
              <div className="bg-[#B7C8B5] rounded-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] overflow-hidden transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] transition-all">
                <div className="relative">
                  <img
                    alt={currentProfile.name}
                    className="w-full h-80 object-cover"
                    src={currentProfile.profilePicture || "/placeholder.svg"}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                    <h2 className="text-2xl font-black transform -skew-x-1">
                      {currentProfile.name}, {currentProfile.age}
                    </h2>
                    <p className="text-base font-bold">
                      {currentProfile.userType === "owner" ? "HAS A PLACE" : "LOOKING FOR A PLACE"}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center text-[#004D40] space-x-3">
                    <span className="flex items-center gap-1 font-black text-sm">
                      <svg
                        className="w-4 h-4 text-[#44C76F]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                        />
                      </svg>
                      {currentProfile.preferences?.smoking ? "SMOKER" : "NON-SMOKER"}
                    </span>
                    <span className="flex items-center gap-1 font-black text-sm">
                      <svg
                        className="w-4 h-4 text-[#44C76F]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      {currentProfile.preferences?.pets ? "PET-FRIENDLY" : "NO PETS"}
                    </span>
                  </div>
                  <p className="text-[#004D40] font-bold leading-relaxed border-l-4 border-[#44C76F] pl-3 text-sm">
                    {currentProfile.bio}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center items-center space-x-8">
              {/* Cross/Pass Button */}
              <button
                className="size-20 bg-[#F2F5F1] border-4 border-[#004D40] text-red-500 hover:bg-red-50 flex items-center justify-center rounded-full shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all group"
                onClick={() => handleSwipe(false)}
              >
                <svg
                  className="w-10 h-10 group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>

              {/* Heart/Like Button */}
              <button
                className="size-24 bg-[#44C76F] text-[#004D40] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] flex items-center justify-center rounded-full transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] transition-all group"
                onClick={() => handleSwipe(true)}
              >
                <svg
                  className="w-12 h-12 group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
