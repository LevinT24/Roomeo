"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function UserTypeSelection({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState<"owner" | "seeker" | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user || !selectedType) return

    setLoading(true)

    // Mock user type update - just update localStorage
    const updatedUser = {
      ...user,
      userType: selectedType,
      updatedAt: new Date(),
    }

    localStorage.setItem("mockUser", JSON.stringify(updatedUser))

    setTimeout(() => {
      setLoading(false)
      onComplete()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#B7C8B5]">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-[#004D40] mb-2 transform -skew-x-2">WHAT'S YOUR SITUATION?</h2>
            <div className="w-32 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            <p className="text-lg font-bold text-[#004D40]">Choose your housing situation to find the right matches</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div
              onClick={() => setSelectedType("owner")}
              className={`p-8 border-4 border-[#004D40] cursor-pointer transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] ${
                selectedType === "owner"
                  ? "bg-[#44C76F] text-[#004D40] shadow-[8px_8px_0px_0px_#004D40]"
                  : "bg-[#F2F5F1] text-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:bg-[#B7C8B5]"
              }`}
            >
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] ${
                    selectedType === "owner" ? "bg-[#F2F5F1] text-[#44C76F]" : "bg-[#44C76F] text-[#004D40]"
                  }`}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-4 transform -skew-x-1">I HAVE A PLACE</h3>
                <p className="font-bold leading-tight">
                  I own or rent a place and I'm looking for a roommate to share it with
                </p>
              </div>
            </div>

            <div
              onClick={() => setSelectedType("seeker")}
              className={`p-8 border-4 border-[#004D40] cursor-pointer transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] ${
                selectedType === "seeker"
                  ? "bg-[#44C76F] text-[#004D40] shadow-[8px_8px_0px_0px_#004D40]"
                  : "bg-[#F2F5F1] text-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:bg-[#B7C8B5]"
              }`}
            >
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] ${
                    selectedType === "seeker" ? "bg-[#F2F5F1] text-[#44C76F]" : "bg-[#44C76F] text-[#004D40]"
                  }`}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-4 transform -skew-x-1">I'M LOOKING FOR A PLACE</h3>
                <p className="font-bold leading-tight">
                  I need to find a room or place to share with someone who already has one
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedType || loading}
            className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black text-xl py-4 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
          >
            {loading ? "SETTING UP..." : "CONTINUE TO MATCHING"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
