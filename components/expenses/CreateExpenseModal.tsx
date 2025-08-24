"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateExpenseModalProps, SplitType } from "@/types/expenses"
import { Mail, MessageCircle, UserPlus, X, Users } from "lucide-react"

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

  // Invite state
  const [invites, setInvites] = useState<Array<{
    id: string;
    method: 'email' | 'whatsapp';
    contact: string;
    message?: string;
  }>>([])
  const [newInviteMethod, setNewInviteMethod] = useState<'email' | 'whatsapp'>('email')
  const [newInviteContact, setNewInviteContact] = useState('')
  const [newInviteMessage, setNewInviteMessage] = useState('')

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
      // Reset invite state
      setInvites([])
      setNewInviteMethod('email')
      setNewInviteContact('')
      setNewInviteMessage('')
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

  // Invite handling functions
  const addInvite = () => {
    if (!newInviteContact.trim()) return

    // Validate contact based on method
    if (newInviteMethod === 'email' && !newInviteContact.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (newInviteMethod === 'whatsapp' && newInviteContact.length < 8) {
      setError('Please enter a valid phone number')
      return
    }

    // Check for duplicates
    if (invites.some(inv => inv.contact === newInviteContact.trim())) {
      setError('This contact is already in the invite list')
      return
    }

    const newInvite = {
      id: Date.now().toString(),
      method: newInviteMethod,
      contact: newInviteContact.trim(),
      message: newInviteMessage.trim() || undefined
    }

    setInvites(prev => [...prev, newInvite])
    setNewInviteContact('')
    setNewInviteMessage('')
    setError('')
  }

  const removeInvite = (inviteId: string) => {
    setInvites(prev => prev.filter(inv => inv.id !== inviteId))
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length > 0 && !phone.startsWith('+')) {
      return '+' + cleaned;
    }
    return phone;
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
    
    if (selectedFriends.length === 0 && invites.length === 0) {
      setError('Select friends or add invites to create a room')
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
      // For equal split, adjust the custom amounts
      let adjustedParticipants = selectedFriends;
      let customAmountsList = undefined;

      if (formData.split_type === 'equal') {
        // Don't include creator in the participants for equal split
        // The backend will handle adding them with 0 owed
        customAmountsList = undefined;
      } else if (formData.split_type === 'custom') {
        customAmountsList = selectedFriends.map(friendId => 
          parseFloat(customAmounts[friendId] || '0')
        );
      }

      await onCreateExpense({
        name: formData.name,
        description: formData.description || undefined,
        total_amount: parseFloat(formData.total_amount),
        split_type: formData.split_type,
        participants: adjustedParticipants,
        custom_amounts: customAmountsList,
        invites: invites.length > 0 ? invites : undefined
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

            {/* Invite Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Invite People
                </label>
                <span className="text-xs text-gray-500">
                  {invites.length > 0 && `${invites.length} pending invite${invites.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Add Invite Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                <div className="space-y-3">
                  {/* Method Selection */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewInviteMethod('email')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        newInviteMethod === 'email'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInviteMethod('whatsapp')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        newInviteMethod === 'whatsapp'
                          ? 'bg-green-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </div>

                  {/* Contact Input */}
                  <div className="flex gap-2">
                    <Input
                      type={newInviteMethod === 'email' ? 'email' : 'tel'}
                      placeholder={
                        newInviteMethod === 'email' 
                          ? 'friend@example.com' 
                          : '+1 (555) 123-4567'
                      }
                      value={newInviteContact}
                      onChange={(e) => setNewInviteContact(
                        newInviteMethod === 'whatsapp' 
                          ? formatPhoneNumber(e.target.value)
                          : e.target.value
                      )}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addInvite}
                      disabled={!newInviteContact.trim()}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Custom Message */}
                  <Input
                    placeholder="Custom message (optional)"
                    value={newInviteMessage}
                    onChange={(e) => setNewInviteMessage(e.target.value)}
                    maxLength={200}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Invite List */}
              {invites.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {invite.method === 'email' ? (
                          <Mail className="w-4 h-4 text-blue-500" />
                        ) : (
                          <MessageCircle className="w-4 h-4 text-green-500" />
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {invite.contact}
                          </span>
                          {invite.message && (
                            <p className="text-xs text-gray-600 truncate max-w-48">
                              "{invite.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeInvite(invite.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {invites.length === 0 && (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No invites added yet</p>
                  <p className="text-xs text-gray-400">Invite people to join this expense room</p>
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
              disabled={isLoading || (selectedFriends.length === 0 && invites.length === 0)}
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