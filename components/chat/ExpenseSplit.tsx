"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ExpenseSplitProps } from "@/types/enhanced-chat"

export default function ExpenseSplit({ 
  chatUsers, 
  onExpenseCreate, 
  detectedExpense,
  isOpen, 
  onClose 
}: ExpenseSplitProps) {
  const [description, setDescription] = useState(detectedExpense?.description || "")
  const [amount, setAmount] = useState(detectedExpense?.amount?.toString() || "")
  const [splitWith, setSplitWith] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const handleUserToggle = (userId: string) => {
    setSplitWith(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) {
      alert("Please enter a description")
      return
    }
    
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (splitWith.length === 0) {
      alert("Please select at least one person to split with")
      return
    }

    setIsCreating(true)
    try {
      await onExpenseCreate(description.trim(), amountNum, splitWith)
      
      // Reset form
      setDescription("")
      setAmount("")
      setSplitWith([])
      onClose()
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Failed to create expense split. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const splitAmount = splitWith.length > 0 ? parseFloat(amount) / (splitWith.length + 1) : 0

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl border-2 border-sage/30 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="roomeo-heading text-xl text-emerald-primary">💰 Split Expense</h3>
              <button 
                onClick={onClose}
                className="text-sage hover:text-emerald-primary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detectedExpense && (
              <div className="bg-moss-green/10 border border-moss-green/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🤖</span>
                  <span className="roomeo-body text-sm font-medium text-emerald-primary">
                    Detected expense
                  </span>
                </div>
                <p className="roomeo-body text-sm text-sage">
                  I found &ldquo;{detectedExpense.description}&rdquo; for ${detectedExpense.amount.toFixed(2)} in your message
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  What did you pay for?
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Pizza delivery, Groceries, Utilities"
                  className="w-full"
                  maxLength={100}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Total Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-primary">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8"
                  />
                </div>
              </div>

              {/* Split With */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Split with
                </label>
                <div className="space-y-2">
                  {chatUsers.map(user => (
                    <label key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sage/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={splitWith.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="w-4 h-4 text-emerald-primary border-sage/30 rounded focus:ring-emerald-primary"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="roomeo-body text-emerald-primary">{user.name}</span>
                      </div>
                      {splitWith.includes(user.id) && splitAmount > 0 && (
                        <span className="roomeo-body text-sm text-moss-green font-medium">
                          ${splitAmount.toFixed(2)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Split Summary */}
              {splitWith.length > 0 && splitAmount > 0 && (
                <div className="bg-moss-green/10 border border-moss-green/30 rounded-lg p-3">
                  <h4 className="roomeo-body font-medium text-emerald-primary mb-2">Split Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-sage">Total amount:</span>
                      <span className="text-emerald-primary font-medium">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sage">Split between {splitWith.length + 1} people:</span>
                      <span className="text-moss-green font-medium">${splitAmount.toFixed(2)} each</span>
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={isCreating || !description.trim() || !amount || splitWith.length === 0}
                  className="flex-1 roomeo-button-primary"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-accent/30 border-t-gold-accent"></div>
                      Creating...
                    </div>
                  ) : (
                    'Propose Split'
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