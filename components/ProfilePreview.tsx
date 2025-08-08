"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

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
  userType?: "seeker" | "provider" | null
}

interface ProfilePreviewProps {
  user: User
  onBack: () => void
}

export default function ProfilePreview({ user, onBack }: ProfilePreviewProps) {
  return (
    <div className="bg-[#F2F5F1] text-[#004D40] min-h-screen">
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-[#004D40] border-b-4 border-[#44C76F] sticky top-0 z-10">
          <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                onClick={onBack}
                className="bg-transparent hover:bg-[#44C76F]/20 text-[#F2F5F1] border-2 border-[#F2F5F1] shadow-[2px_2px_0px_0px_#F2F5F1] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#F2F5F1] transition-all p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#44C76F] border-2 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#F2F5F1]">
                  <span className="text-[#004D40] font-black text-sm transform -rotate-3">R</span>
                </div>
                <h1 className="text-2xl font-black text-[#F2F5F1] transform -skew-x-3">PROFILE PREVIEW</h1>
              </div>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center p-4 bg-[#F2F5F1] min-h-[calc(100vh-80px)]">
          <div className="w-full max-w-sm mx-auto flex flex-col justify-center min-h-[calc(100vh-160px)]">
            <div className="text-center mb-4">
              <h2 className="text-lg font-black text-[#004D40] transform -skew-x-1">
                HOW OTHERS SEE YOUR PROFILE
              </h2>
              <div className="w-24 h-2 bg-[#44C76F] mx-auto transform skew-x-12 mt-2"></div>
            </div>

            <div className="relative mb-8">
              <div className="bg-[#B7C8B5] rounded-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] overflow-hidden transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] transition-all">
                <div className="relative">
                  <img
                    alt={user.name}
                    className="w-full h-80 object-cover"
                    src={user.profilePicture || "/placeholder.svg"}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                    <h2 className="text-2xl font-black transform -skew-x-1">
                      {user.name}, {user.age}
                    </h2>
                    <p className="text-base font-bold">
                      {user.userType === "provider" ? "HAS A PLACE" : "LOOKING FOR A PLACE"}
                    </p>
                    {user.location && (
                      <p className="text-sm font-bold opacity-90">📍 {user.location}</p>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center text-[#004D40] space-x-3 flex-wrap gap-2">
                    <span className="flex items-center gap-1 font-black text-sm">
                      <svg
                        className={`w-4 h-4 ${user.preferences?.smoking ? 'text-red-500' : 'text-[#44C76F]'}`}
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
                      {user.preferences?.smoking ? "SMOKER" : "NON-SMOKER"}
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
                      {user.preferences?.pets ? "PET-FRIENDLY" : "NO PETS"}
                    </span>
                    {user.preferences?.vegetarian && (
                      <span className="flex items-center gap-1 font-black text-sm">
                        <span className="text-[#44C76F]">🌱</span>
                        VEGETARIAN
                      </span>
                    )}
                    {user.preferences?.drinking && (
                      <span className="flex items-center gap-1 font-black text-sm">
                        <span className="text-[#44C76F]">🍺</span>
                        DRINKS
                      </span>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-[#004D40] font-bold leading-relaxed border-l-4 border-[#44C76F] pl-3 text-sm">
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="flex justify-center">
              <Button
                onClick={onBack}
                className="bg-[#44C76F] text-[#004D40] border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] flex items-center justify-center px-8 py-3 rounded-lg transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all font-black"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                BACK TO SETTINGS
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}