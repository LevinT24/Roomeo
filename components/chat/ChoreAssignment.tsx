"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChoreAssignmentProps } from "@/types/enhanced-chat"

export default function ChoreAssignment({ 
  chatUsers, 
  onChoreAssign, 
  isOpen, 
  onClose 
}: ChoreAssignmentProps) {
  const [choreName, setChoreName] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!choreName.trim()) {
      alert("Please enter a chore name")
      return
    }
    
    if (!assignedTo) {
      alert("Please select who to assign this chore to")
      return
    }

    setIsAssigning(true)
    try {
      const dueDateObj = dueDate ? new Date(dueDate) : undefined
      await onChoreAssign(choreName.trim(), assignedTo, dueDateObj)
      
      // Reset form
      setChoreName("")
      setAssignedTo("")
      setDueDate("")
      onClose()
    } catch (error) {
      console.error('Error assigning chore:', error)
      alert('Failed to assign chore. Please try again.')
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl border-2 border-sage/30 w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="roomeo-heading text-xl text-emerald-primary">🧹 Assign Chore</h3>
              <button 
                onClick={onClose}
                className="text-sage hover:text-emerald-primary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Chore Name */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Chore
                </label>
                <Input
                  value={choreName}
                  onChange={(e) => setChoreName(e.target.value)}
                  placeholder="e.g., Take out trash, Clean kitchen, Vacuum living room"
                  className="w-full"
                  maxLength={100}
                />
              </div>

              {/* Assign To */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Assign to
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full p-3 border-2 border-sage/30 rounded-lg roomeo-body focus:border-moss-green"
                >
                  <option value="">Select a roommate</option>
                  {chatUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Due Date (optional)
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              {/* Quick Assign Buttons */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Quick Options
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Today', 'Tomorrow', 'This Week', 'Next Week'].map(option => {
                    const getDate = (option: string) => {
                      const today = new Date()
                      switch (option) {
                        case 'Today':
                          return today.toISOString().split('T')[0]
                        case 'Tomorrow':
                          const tomorrow = new Date(today)
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          return tomorrow.toISOString().split('T')[0]
                        case 'This Week':
                          const thisWeek = new Date(today)
                          thisWeek.setDate(thisWeek.getDate() + (7 - thisWeek.getDay()))
                          return thisWeek.toISOString().split('T')[0]
                        case 'Next Week':
                          const nextWeek = new Date(today)
                          nextWeek.setDate(nextWeek.getDate() + (14 - nextWeek.getDay()))
                          return nextWeek.toISOString().split('T')[0]
                        default:
                          return ''
                      }
                    }

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDueDate(getDate(option))}
                        className="p-2 text-sm border border-sage/30 rounded-lg hover:bg-sage/10 transition-colors roomeo-body"
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAssigning || !choreName.trim() || !assignedTo}
                  className="flex-1 roomeo-button-primary"
                >
                  {isAssigning ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-accent/30 border-t-gold-accent"></div>
                      Assigning...
                    </div>
                  ) : (
                    'Assign Chore'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}