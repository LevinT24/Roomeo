"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Home, Search } from "lucide-react"

interface UpgradeUserTypeSelectionProps {
  onSelect: (userType: "provider" | "seeker") => void
  onCancel: () => void
}

export default function UpgradeUserTypeSelection({ onSelect, onCancel }: UpgradeUserTypeSelectionProps) {
  const [selectedType, setSelectedType] = useState<"provider" | "seeker" | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!selectedType) return
    
    setLoading(true)
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    onSelect(selectedType)
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] bg-[#B7C8B5]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={onCancel}
              className="bg-[#F2F5F1] hover:bg-gray-200 text-[#004D40] border-2 border-[#004D40] p-3 font-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#44C76F] border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-2 shadow-[4px_4px_0px_0px_#004D40]">
                <span className="text-[#004D40] font-black text-lg transform -rotate-3">R</span>
              </div>
              <p className="text-sm font-bold text-[#44C76F]">Step 2 of 4</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-[#004D40] mb-2 transform -skew-x-2">
              CHOOSE YOUR PATH!
            </h2>
            <div className="w-32 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            <h3 className="text-2xl font-black text-[#004D40] mb-4 transform -skew-x-1">
              WHAT&apos;S YOUR HOUSING SITUATION?
            </h3>
            <p className="text-lg font-bold text-[#004D40]">
              This determines what kind of roommate matches you'll see
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Provider Option */}
            <div
              onClick={() => !loading && setSelectedType("provider")}
              className={`p-8 border-4 border-[#004D40] cursor-pointer transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] ${
                selectedType === "provider"
                  ? "bg-[#44C76F] text-[#004D40] shadow-[8px_8px_0px_0px_#004D40]"
                  : "bg-[#F2F5F1] text-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:bg-[#B7C8B5]"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] ${
                    selectedType === "provider" ? "bg-[#F2F5F1] text-[#44C76F]" : "bg-[#44C76F] text-[#004D40]"
                  }`}
                >
                  <Home className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-4 transform -skew-x-1">I HAVE A PLACE</h3>
                <p className="font-bold leading-tight">
                  I own or rent a place and I&apos;m looking for roommates to share it with
                </p>
                <div className="mt-4 text-sm font-black text-[#44C76F] bg-[#F2F5F1] p-2 border-2 border-[#004D40] rounded">
                  👥 You&apos;ll see: People looking for places to live
                </div>
                {selectedType === "provider" && (
                  <div className="mt-4 text-sm font-black text-[#004D40] bg-[#F2F5F1] p-2 border-2 border-[#004D40]">
                    ✓ SELECTED - Next: Add room photos
                  </div>
                )}
              </div>
            </div>

            {/* Seeker Option */}
            <div
              onClick={() => !loading && setSelectedType("seeker")}
              className={`p-8 border-4 border-[#004D40] cursor-pointer transition-all transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#004D40] ${
                selectedType === "seeker"
                  ? "bg-[#44C76F] text-[#004D40] shadow-[8px_8px_0px_0px_#004D40]"
                  : "bg-[#F2F5F1] text-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:bg-[#B7C8B5]"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] ${
                    selectedType === "seeker" ? "bg-[#F2F5F1] text-[#44C76F]" : "bg-[#44C76F] text-[#004D40]"
                  }`}
                >
                  <Search className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-4 transform -skew-x-1">I&apos;M LOOKING FOR A PLACE</h3>
                <p className="font-bold leading-tight">
                  I need to find a room or place to share with someone who already has one
                </p>
                <div className="mt-4 text-sm font-black text-[#44C76F] bg-[#F2F5F1] p-2 border-2 border-[#004D40] rounded">
                  🏠 You&apos;ll see: People with available spaces
                </div>
                {selectedType === "seeker" && (
                  <div className="mt-4 text-sm font-black text-[#004D40] bg-[#F2F5F1] p-2 border-2 border-[#004D40]">
                    ✓ SELECTED - Next: Set your budget
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedType || loading}
            className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black text-xl py-4 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#F2F5F1] border-t-transparent rounded-full animate-spin"></div>
                PROCESSING...
              </div>
            ) : (
              selectedType === "provider" ? "CONTINUE TO ROOM PHOTOS" : selectedType === "seeker" ? "CONTINUE TO BUDGET" : "SELECT YOUR SITUATION"
            )}
          </Button>

          <div className="mt-6 text-center">
            <div className="bg-[#44C76F]/20 border-2 border-[#44C76F] p-3 rounded">
              <p className="text-sm font-black text-[#004D40]">
                💡 Don&apos;t worry! You can change this later in settings if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}