import { useState, useEffect } from "react"
import { CreateExpenseGroupRequest } from "@/types/expenses"

interface Friend {
  id: string
  name: string
  profilePicture?: string
}

interface CreateExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  friends: Friend[]
  onCreateExpense: (data: CreateExpenseGroupRequest) => Promise<void>
  eventContext?: {
    eventId: string
    eventName: string
    eventMembers: Array<{ user_id: string; name: string }>
  }
}

export default function CreateExpenseModal({
  isOpen,
  onClose,
  friends,
  onCreateExpense,
  eventContext
}: CreateExpenseModalProps) {
  const [formData, setFormData] = useState<CreateExpenseGroupRequest>({
    name: '',
    description: '',
    total_amount: 0,
    split_type: 'equal',
    participants: [],
    custom_amounts: [],
    create_group_chat: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEventInfo, setShowEventInfo] = useState(true)

  // Filter out event members from friends list if in event context
  const availableFriends = eventContext 
    ? friends.filter(f => !eventContext.eventMembers.some(m => m.user_id === f.id))
    : friends

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      total_amount: 0,
      split_type: 'equal',
      participants: [],
      custom_amounts: [],
      create_group_chat: false
    })
    setError('')
    setIsLoading(false)
    setShowEventInfo(true)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Room name is required')
      return
    }
    if (formData.total_amount <= 0) {
      setError('Total amount must be greater than 0')
      return
    }

    setIsLoading(true)

    try {
      await onCreateExpense({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleParticipant = (participantId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(participantId)
        ? prev.participants.filter(id => id !== participantId)
        : [...prev.participants, participantId]
    }))
  }

  const formatAmount = (value: string) => {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-sage/20">
          <div className="flex items-center justify-between">
            <h2 className="roomeo-heading text-2xl text-emerald-primary">
              {eventContext ? `🎉 Create Room in ${eventContext.eventName}` : '🏠 Create Room'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 text-emerald-primary/50 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Event Context Info */}
          {eventContext && showEventInfo && (
            <div className="mb-4 p-4 bg-emerald-primary/10 border border-emerald-primary/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-primary mb-1">
                    📌 Event Room
                  </p>
                  <p className="text-xs text-emerald-primary/70">
                    All {eventContext.eventMembers.length} event members will be automatically added to this room
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {eventContext.eventMembers.slice(0, 3).map(member => (
                      <span key={member.user_id} className="text-xs px-2 py-1 bg-white/50 rounded-full text-emerald-primary">
                        {member.name}
                      </span>
                    ))}
                    {eventContext.eventMembers.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-white/50 rounded-full text-emerald-primary">
                        +{eventContext.eventMembers.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEventInfo(false)}
                  className="text-emerald-primary/50 hover:text-emerald-primary ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-alert-red/10 border border-alert-red/20 rounded-lg text-alert-red text-sm">
              {error}
            </div>
          )}

          {/* Room Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-emerald-primary mb-2">
              Room Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Hotel Stay, Dinner at Restaurant"
              className="w-full p-3 border border-sage/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-primary focus:border-transparent"
              required
            />
          </div>

          {/* Total Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-emerald-primary mb-2">
              Total Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-primary/50">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: formatAmount(e.target.value) }))}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-3 border border-sage/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-primary focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-emerald-primary mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add notes about this expense..."
              rows={3}
              className="w-full p-3 border border-sage/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Split Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-emerald-primary mb-2">
              Split Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, split_type: 'equal' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.split_type === 'equal'
                    ? 'border-emerald-primary bg-emerald-primary/10 text-emerald-primary'
                    : 'border-sage/30 text-emerald-primary/60 hover:border-sage/50'
                }`}
              >
                <span className="block text-lg mb-1">🟰</span>
                <span className="text-sm font-medium">Equal Split</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, split_type: 'custom' }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  formData.split_type === 'custom'
                    ? 'border-emerald-primary bg-emerald-primary/10 text-emerald-primary'
                    : 'border-sage/30 text-emerald-primary/60 hover:border-sage/50'
                }`}
                disabled={eventContext !== undefined}
              >
                <span className="block text-lg mb-1">⚖️</span>
                <span className="text-sm font-medium">Custom Split</span>
                {eventContext && (
                  <span className="text-xs text-emerald-primary/50 mt-1 block">Not available for events</span>
                )}
              </button>
            </div>
          </div>

          {/* Additional Friends (only for event rooms, optional) */}
          {eventContext && availableFriends.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-emerald-primary mb-3">
                Add Additional Friends ({formData.participants.length} selected)
              </label>
              <p className="text-xs text-emerald-primary/60 mb-2">
                Optional: Add friends who aren't event members to this specific room
              </p>
              <div className="max-h-32 overflow-y-auto border border-sage/30 rounded-lg">
                {availableFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center p-3 hover:bg-sage/10 cursor-pointer transition-colors"
                    onClick={() => toggleParticipant(friend.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.participants.includes(friend.id)}
                      onChange={() => toggleParticipant(friend.id)}
                      className="mr-3 text-emerald-primary focus:ring-emerald-primary"
                    />
                    <div
                      className="w-8 h-8 rounded-full bg-sage/30 bg-cover bg-center mr-3"
                      style={{
                        backgroundImage: friend.profilePicture 
                          ? `url("${friend.profilePicture}")` 
                          : undefined
                      }}
                    />
                    <span className="roomeo-body text-emerald-primary">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Select Participants (only for non-event rooms) */}
          {!eventContext && friends.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-emerald-primary mb-3">
                Select Participants * ({formData.participants.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto border border-sage/30 rounded-lg">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center p-3 hover:bg-sage/10 cursor-pointer transition-colors"
                    onClick={() => toggleParticipant(friend.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.participants.includes(friend.id)}
                      onChange={() => toggleParticipant(friend.id)}
                      className="mr-3 text-emerald-primary focus:ring-emerald-primary"
                    />
                    <div
                      className="w-8 h-8 rounded-full bg-sage/30 bg-cover bg-center mr-3"
                      style={{
                        backgroundImage: friend.profilePicture 
                          ? `url("${friend.profilePicture}")` 
                          : undefined
                      }}
                    />
                    <span className="roomeo-body text-emerald-primary">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mb-6 p-4 bg-sage/10 rounded-lg">
            <h3 className="text-sm font-medium text-emerald-primary mb-2">Summary</h3>
            <div className="space-y-2 text-sm text-emerald-primary/70">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium text-emerald-primary">${formData.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Participants:</span>
                <span className="font-medium text-emerald-primary">
                  {eventContext 
                    ? `${eventContext.eventMembers.length + formData.participants.length + 1} people`
                    : `${formData.participants.length + 1} people`
                  }
                </span>
              </div>
              {formData.split_type === 'equal' && formData.total_amount > 0 && (
                <div className="flex justify-between">
                  <span>Each Pays:</span>
                  <span className="font-medium text-emerald-primary">
                    ${eventContext
                      ? (formData.total_amount / (eventContext.eventMembers.length + formData.participants.length + 1)).toFixed(2)
                      : (formData.total_amount / (formData.participants.length + 1)).toFixed(2)
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-sage/20 text-emerald-primary rounded-lg hover:bg-sage/30 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isLoading || 
                !formData.name.trim() || 
                formData.total_amount <= 0 ||
                (!eventContext && formData.participants.length === 0)
              }
              className="flex-1 py-3 px-4 bg-emerald-primary text-gold-accent rounded-lg hover:bg-emerald-primary/90 transition-colors disabled:opacity-50 font-medium"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}