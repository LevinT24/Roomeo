"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateExpenseModalProps, SplitType } from "@/types/expenses"

export default function CreateExpenseModal({ 
  isOpen, 
  onClose, 
  friends, 
  onCreateExpense 
}: CreateExpenseModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_amount: '',
    split_type: 'equal' as SplitType,
    create_group_chat: false
  })
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [customAmounts, setCustomAmounts] = useState<{ [friendId: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        total_amount: '',
        split_type: 'equal',
        create_group_chat: false
      })
      setSelectedFriends([])
      setCustomAmounts({})
      setError('')
    }
  }, [isOpen])

  // Auto-calculate equal splits when friends or total amount changes
  useEffect(() => {
    if (formData.split_type === 'equal' && selectedFriends.length > 0 && formData.total_amount) {
      const equalAmount = (parseFloat(formData.total_amount) / selectedFriends.length).toFixed(2)
      const newCustomAmounts: { [friendId: string]: string } = {}
      selectedFriends.forEach(friendId => {
        newCustomAmounts[friendId] = equalAmount
      })
      setCustomAmounts(newCustomAmounts)
    }
  }, [formData.split_type, selectedFriends, formData.total_amount])

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSelection = prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
      
      // Remove custom amount if friend is deselected
      if (!newSelection.includes(friendId)) {
        setCustomAmounts(prev => {
          const { [friendId]: removed, ...rest } = prev
          return rest
        })
      }
      
      return newSelection
    })
  }

  const handleCustomAmountChange = (friendId: string, amount: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [friendId]: amount
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Expense name is required')
      return false
    }
    
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      setError('Valid total amount is required')
      return false
    }
    
    if (selectedFriends.length === 0) {
      setError('At least one friend must be selected')
      return false
    }

    if (formData.split_type === 'custom') {
      const totalCustom = Object.values(customAmounts)
        .reduce((sum, amount) => sum + parseFloat(amount || '0'), 0)
      
      if (totalCustom > parseFloat(formData.total_amount)) {
        setError('Custom amounts cannot exceed the total amount')
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      const customAmountsList = formData.split_type === 'custom' 
        ? selectedFriends.map(friendId => parseFloat(customAmounts[friendId] || '0'))
        : undefined

      await onCreateExpense({
        name: formData.name,
        description: formData.description || undefined,
        total_amount: parseFloat(formData.total_amount),
        split_type: formData.split_type,
        participants: selectedFriends,
        custom_amounts: customAmountsList,
        create_group_chat: formData.create_group_chat
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="roomeo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="roomeo-heading text-2xl flex items-center gap-2">
              <span>🏠</span> Create Room
            </h2>
            <button
              onClick={onClose}
              className="roomeo-interactive text-emerald-primary/60 hover:text-emerald-primary hover:no-underline p-2 rounded-lg hover:bg-sage/10"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-alert-red/10 border border-alert-red/20 rounded-xl animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-alert-red text-lg">⚠️</span>
                <span className="roomeo-body text-alert-red text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Expense Details */}
            <div className="space-y-4">
              <div>
                <label className="roomeo-body font-semibold text-emerald-primary mb-3 block flex items-center gap-2">
                  <span>🏷️</span> Room Name *
                </label>
                <input
                  type="text"
                  placeholder="Pizza Night, Rent Split, Trip Expenses..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-mint-cream border border-sage/30 rounded-xl roomeo-body text-emerald-primary placeholder:text-emerald-primary/50 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="roomeo-body font-semibold text-emerald-primary mb-3 block flex items-center gap-2">
                  <span>📝</span> Description
                </label>
                <input
                  type="text"
                  placeholder="Add some details about this expense..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-mint-cream border border-sage/30 rounded-xl roomeo-body text-emerald-primary placeholder:text-emerald-primary/50 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="roomeo-body font-semibold text-emerald-primary mb-3 block flex items-center gap-2">
                  <span>💰</span> Total Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 roomeo-body text-emerald-primary/60 text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-mint-cream border border-sage/30 rounded-xl roomeo-body text-emerald-primary placeholder:text-emerald-primary/50 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Split Type */}
            <div>
              <label className="roomeo-body font-semibold text-emerald-primary mb-4 block flex items-center gap-2">
                <span>⚖️</span> How to split?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, split_type: 'equal' }))}
                  className={`p-4 rounded-xl roomeo-body font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 ${
                    formData.split_type === 'equal'
                      ? 'roomeo-button-primary'
                      : 'roomeo-button-secondary'
                  }`}
                >
                  <span>🍽️</span> Equal Split
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, split_type: 'custom' }))}
                  className={`p-4 rounded-xl roomeo-body font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 ${
                    formData.split_type === 'custom'
                      ? 'roomeo-button-primary'
                      : 'roomeo-button-secondary'
                  }`}
                >
                  <span>🎯</span> Custom Amounts
                </button>
              </div>
            </div>

            {/* Friends Selection */}
            <div>
              <label className="roomeo-body font-semibold text-emerald-primary mb-4 block flex items-center gap-2">
                <span>👥</span> Select Friends * 
                <span className="text-gold-accent">({selectedFriends.length} selected)</span>
              </label>
              
              {friends.length === 0 ? (
                <div className="text-center py-12 bg-sage/5 rounded-xl border border-sage/20">
                  <div className="text-4xl mb-4">😢</div>
                  <p className="roomeo-body text-emerald-primary/60">No friends available.</p>
                  <p className="roomeo-body text-emerald-primary/50 text-sm mt-1">Add friends first to split expenses with them.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {friends.map(friend => {
                    const isSelected = selectedFriends.includes(friend.id)
                    const customAmount = customAmounts[friend.id] || ''
                    
                    return (
                      <div
                        key={friend.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-card ${
                          isSelected
                            ? 'border-emerald-primary bg-emerald-primary/5 shadow-soft'
                            : 'border-sage/30 hover:border-sage/50 bg-white'
                        }`}
                        onClick={() => handleFriendToggle(friend.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-emerald-primary border-emerald-primary' 
                              : 'border-sage/50'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-full bg-sage/30 bg-cover bg-center border-2 border-white shadow-sm"
                              style={{
                                backgroundImage: friend.profilePicture
                                  ? `url("${friend.profilePicture}")`
                                  : 'url("/placeholder.svg?height=40&width=40")'
                              }}
                            />
                            <span className="roomeo-body font-semibold text-emerald-primary">{friend.name}</span>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="roomeo-body text-emerald-primary/60">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={customAmount}
                              onChange={(e) => handleCustomAmountChange(friend.id, e.target.value)}
                              disabled={formData.split_type === 'equal'}
                              className={`w-20 px-2 py-1 text-sm bg-mint-cream border border-sage/30 rounded-lg roomeo-body text-emerald-primary focus:outline-none focus:ring-2 focus:ring-gold-accent transition-all ${
                                formData.split_type === 'equal' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Group Chat Option */}
            <div className="flex items-center gap-4 p-4 bg-gold-accent/5 border border-gold-accent/20 rounded-xl">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                formData.create_group_chat 
                  ? 'bg-emerald-primary border-emerald-primary' 
                  : 'border-sage/50'
              }`}
                onClick={() => setFormData(prev => ({ ...prev, create_group_chat: !prev.create_group_chat }))}
              >
                {formData.create_group_chat && <span className="text-white text-xs">✓</span>}
              </div>
              <label className="roomeo-body font-semibold text-emerald-primary cursor-pointer flex items-center gap-2" 
                onClick={() => setFormData(prev => ({ ...prev, create_group_chat: !prev.create_group_chat }))}
              >
                <span>💬</span> Create group chat for this room
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-sage/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 roomeo-button-secondary"
            >
              <span>❌</span> Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || selectedFriends.length === 0}
              className={`flex-1 roomeo-button-primary flex items-center justify-center gap-2 ${
                isLoading || selectedFriends.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-accent border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <span>🚀</span> Create Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}