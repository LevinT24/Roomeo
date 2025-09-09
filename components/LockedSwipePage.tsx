"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface LockedSwipePageProps {
  onUpgrade: () => void
  userType: string
  lockReason?: 'upgrade_required' | 'other'
}

export default function LockedSwipePage({ 
  onUpgrade, 
  userType, 
  lockReason = 'upgrade_required' 
}: LockedSwipePageProps) {
  return (
    <div className="min-h-screen bg-[#F2F5F1] flex flex-col">
      {/* Header - matches SwipePage structure */}
      <div className="px-4 py-6 text-center bg-[#F2F5F1] border-b-4 border-[#004D40]">
        <h1 className="text-3xl font-black text-[#004D40] mb-2 transform -skew-x-2">
          DISCOVER ROOMMATES
        </h1>
        <div className="w-32 h-3 bg-[#44C76F] mx-auto transform skew-x-12"></div>
      </div>

      {/* Main content area - centered upgrade prompt */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#B7C8B5]">
          <CardContent className="p-8 text-center">
            {/* Lock icon */}
            <div className="w-20 h-20 bg-[#44C76F] border-4 border-[#004D40] rounded-full flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-[6px_6px_0px_0px_#004D40]">
              <svg className="w-10 h-10 text-[#004D40] transform -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v3m0-3h3m-3 0h-3m0 0v-3m0 3h-3m3-3V9a3 3 0 116 0v6m-3-6a3 3 0 10-6 0v6" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-[#004D40] mb-4 transform -skew-x-1">
              🔒 ROOMMATE MATCHING LOCKED
            </h2>
            
            <p className="text-lg font-bold text-[#004D40] mb-6 leading-tight">
              {lockReason === 'upgrade_required' && userType === 'quick_access' 
                ? "Quick Access users can't see roommate profiles. Upgrade to unlock swiping and matching features!"
                : "This feature is currently locked. Upgrade to access roommate matching."
              }
            </p>

            {/* Features you'll unlock */}
            <div className="bg-[#F2F5F1] border-2 border-[#004D40] p-4 mb-6 text-left">
              <h3 className="font-black text-[#004D40] mb-3 text-center">🚀 UNLOCK THESE FEATURES:</h3>
              <ul className="space-y-2 text-sm font-bold text-[#004D40]">
                <li className="flex items-center gap-2">
                  <span className="text-[#44C76F]">✓</span>
                  Swipe through potential roommates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#44C76F]">✓</span>
                  Match with compatible people
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#44C76F]">✓</span>
                  View detailed profiles & photos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#44C76F]">✓</span>
                  Access the matches page
                </li>
              </ul>
            </div>

            <Button
              onClick={onUpgrade}
              className="w-full bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black text-lg py-4 px-6 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
            >
              🔓 UNLOCK FULL FEATURES
            </Button>

            <p className="mt-4 text-sm font-bold text-[#004D40] opacity-80">
              Keep all your marketplace listings, expenses, and chat history!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom area - matches SwipePage structure */}
      <div className="px-4 py-6 text-center">
        <p className="text-sm font-bold text-[#004D40] opacity-60">
          You can still use marketplace, expenses, and chat features
        </p>
      </div>
    </div>
  )
}