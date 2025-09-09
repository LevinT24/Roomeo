"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, DollarSign, TrendingUp, Home } from "lucide-react"

interface UpgradeProfileSetupProps {
  userType: "provider" | "seeker"
  onComplete: (budget: string) => void
  onBack: () => void
}

export default function UpgradeProfileSetup({ userType, onComplete, onBack }: UpgradeProfileSetupProps) {
  const [budget, setBudget] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    // Budget is optional, allow empty values
    if (budget && (!budget.trim() || isNaN(Number(budget)) || Number(budget) < 0)) {
      setError("Please enter a valid budget amount (or leave empty)")
      return
    }

    setError("")
    setLoading(true)
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    onComplete(budget)
  }

  const getBudgetLabel = () => {
    if (userType === "provider") {
      return "RENT AMOUNT (OPTIONAL)"
    } else {
      return "MONTHLY BUDGET (OPTIONAL)"
    }
  }

  const getBudgetDescription = () => {
    if (userType === "provider") {
      return "How much rent do you charge per month? This helps seekers find places in their budget."
    } else {
      return "What's your monthly housing budget? This helps you find affordable options."
    }
  }

  const getBudgetPlaceholder = () => {
    if (userType === "provider") {
      return "e.g. 1200"
    } else {
      return "e.g. 800"
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] bg-[#B7C8B5]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={onBack}
              className="bg-[#F2F5F1] hover:bg-gray-200 text-[#004D40] border-2 border-[#004D40] p-3 font-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#44C76F] border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-2 shadow-[4px_4px_0px_0px_#004D40]">
                <span className="text-[#004D40] font-black text-lg transform -rotate-3">R</span>
              </div>
              <p className="text-sm font-bold text-[#44C76F]">
                {userType === "provider" ? "Step 4 of 4" : "Step 3 of 4"}
              </p>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#44C76F] border-4 border-[#004D40] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[6px_6px_0px_0px_#004D40]">
              <DollarSign className="h-8 w-8 text-[#004D40]" />
            </div>

            <h2 className="text-3xl font-black text-[#004D40] mb-2 transform -skew-x-2">
              SET YOUR BUDGET 💰
            </h2>
            <div className="w-32 h-3 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            <p className="text-lg font-bold text-[#004D40] leading-tight">
              {getBudgetDescription()}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-center rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-black text-[#004D40] mb-3">
              {getBudgetLabel()}
            </label>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-[#44C76F]" />
              </div>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={getBudgetPlaceholder()}
                className="w-full pl-12 pr-4 py-4 text-lg border-4 border-[#004D40] font-bold focus:border-[#44C76F] bg-[#F2F5F1] text-[#004D40] rounded-lg"
              />
            </div>
            
            <div className="mt-3 bg-[#F2F5F1] border-2 border-[#004D40] p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-[#44C76F]" />
                <span className="text-sm font-black text-[#004D40]">BUDGET TIPS:</span>
              </div>
              <ul className="text-xs font-bold text-[#004D40] space-y-1">
                {userType === "provider" ? (
                  <>
                    <li>• Include utilities if they're covered</li>
                    <li>• Consider market rates in your area</li>
                    <li>• You can update this anytime in settings</li>
                  </>
                ) : (
                  <>
                    <li>• Include utilities and other housing costs</li>
                    <li>• Be realistic about what you can afford</li>
                    <li>• You can update this anytime in settings</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="mb-6 bg-[#44C76F]/20 border-2 border-[#44C76F] p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-4 w-4 text-[#44C76F]" />
              <span className="text-sm font-black text-[#004D40]">GOOD NEWS!</span>
            </div>
            <p className="text-xs font-bold text-[#004D40]">
              Budget is optional - you can skip this and add it later. But having a budget helps you find better matches!
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => onComplete("")}
              variant="outline"
              disabled={loading}
              className="flex-1 border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black py-3"
            >
              SKIP FOR NOW
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black text-lg py-3 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#004D40] border-t-transparent rounded-full animate-spin"></div>
                  SAVING...
                </div>
              ) : (
                budget ? "SAVE BUDGET" : "CONTINUE"
              )}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs font-bold text-[#004D40] opacity-70">
              Almost done! One more step to activate your upgrade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}