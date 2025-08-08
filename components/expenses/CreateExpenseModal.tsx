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
    split_type: 'equal' as SplitType
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
        split_type: 'equal'
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
        custom_amounts: customAmountsList
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-black tracking-tight">CREATE EXPENSE ROOM</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Expense Details */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Expense Name *
              </label>
              <Input
                type="text"
                placeholder="e.g., Rent, Groceries, Dinner..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <Input
                type="text"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.total_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Split Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                How to split?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, split_type: 'equal' }))}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                    formData.split_type === 'equal'
                      ? 'border-[#F05224] bg-[#F05224] text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Equal Split
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, split_type: 'custom' }))}
                  className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                    formData.split_type === 'custom'
                      ? 'border-[#F05224] bg-[#F05224] text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Custom Amounts
                </button>
              </div>
            </div>

            {/* Friends Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Friends * ({selectedFriends.length} selected)
              </label>
              
              {friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No friends available.</p>
                  <p className="text-sm mt-1">Add friends first to split expenses with them.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {friends.map(friend => {
                    const isSelected = selectedFriends.includes(friend.id)
                    const customAmount = customAmounts[friend.id] || ''
                    
                    return (
                      <div
                        key={friend.id}
                        className={`flex items-center justify-between p-3 border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-[#F05224] bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleFriendToggle(friend.id)}
                            className="w-4 h-4 text-[#F05224] border-gray-300 rounded focus:ring-[#F05224]"
                          />
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full bg-gray-200 bg-cover bg-center"
                              style={{
                                backgroundImage: friend.profilePicture
                                  ? `url("${friend.profilePicture}")`
                                  : 'url("/placeholder.svg?height=40&width=40")'
                              }}
                            />
                            <span className="font-medium text-gray-900">{friend.name}</span>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={customAmount}
                              onChange={(e) => handleCustomAmountChange(friend.id, e.target.value)}
                              disabled={formData.split_type === 'equal'}
                              className="w-20 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || selectedFriends.length === 0}
              className="flex-1 bg-[#F05224] hover:bg-[#D63E1A] text-white font-semibold border-2 border-black shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000]"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}