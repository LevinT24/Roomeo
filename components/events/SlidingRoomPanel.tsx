// components/events/SlidingRoomPanel.tsx
// Sliding panel for displaying room details within events

"use client"

import { useEffect } from "react"

interface SlidingRoomPanelProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function SlidingRoomPanel({ 
  isOpen, 
  onClose, 
  children 
}: SlidingRoomPanelProps) {
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Overlay - only on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`
        fixed inset-y-0 right-0 w-full max-w-md bg-white z-50
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:h-full lg:transform-none lg:shadow-none lg:bg-transparent
        shadow-xl
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Desktop close button - top right */}
        <div className="hidden lg:block absolute top-2 right-2 z-10">
          <button
            onClick={onClose}
            className="p-1 text-emerald-primary/50 hover:text-emerald-primary hover:bg-sage/20 rounded transition-all"
            title="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Mobile header with close button */}
        <div className="sticky top-0 z-10 bg-white border-b border-sage/20 p-3 lg:hidden">
          <div className="flex items-center justify-between">
            <h2 className="roomeo-heading text-base text-emerald-primary">Room Details</h2>
            <button
              onClick={onClose}
              className="p-1 text-emerald-primary/50 hover:text-emerald-primary hover:bg-sage/20 rounded transition-all"
            >
              <span className="text-lg">←</span>
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="h-full">
          {isOpen ? (
            <div className="h-full">
              {children}
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center h-full">
              <div className="text-center p-6">
                <div className="text-4xl mb-3 opacity-40">🏠</div>
                <h3 className="roomeo-heading text-lg text-emerald-primary/60 mb-2">
                  Select a Room
                </h3>
                <p className="roomeo-body text-emerald-primary/40 text-sm">
                  Click on any room to view details and manage expenses
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}