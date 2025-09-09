"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { InviteEventMembersModalProps } from "@/types/events"

export default function InviteEventMembersModal({
  isOpen,
  onClose,
  event,
  availableFriends,
  onInviteMembers
}: InviteEventMembersModalProps) {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  // Filter out friends who are already members of the event
  const existingMemberIds = new Set(event.members.map(m => m.user_id))
  const invitableFriends = availableFriends.filter(friend => !existingMemberIds.has(friend.id))

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFriends.length === invitableFriends.length) {
      setSelectedFriends([])
    } else {
      setSelectedFriends(invitableFriends.map(f => f.id))
    }
  }

  const handleInvite = async () => {
    if (selectedFriends.length === 0) {
      setError('Please select at least one friend to invite')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      await onInviteMembers(selectedFriends)
      setSelectedFriends([])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedFriends([])
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-mint-cream rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-fade-in shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage/20 flex-shrink-0">
          <div>
            <h2 className="roomeo-heading text-xl text-emerald-primary">
              👥 Invite Members
            </h2>
            <p className="roomeo-body text-emerald-primary/70 text-sm">
              Add friends to &quot;{event.name}&quot;
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-emerald-primary/70 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-alert-red/10 border border-alert-red/20 rounded-xl text-alert-red">
              <p className="roomeo-body text-sm">{error}</p>
            </div>
          )}

          {invitableFriends.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 opacity-50">👥</div>
              <h3 className="roomeo-heading text-lg text-emerald-primary mb-2">
                No friends to invite
              </h3>
              <p className="roomeo-body text-emerald-primary/60 text-sm">
                All your friends are already members of this event, or you don&apos;t have any friends added yet.
              </p>
            </div>
          ) : (
            <>
              {/* Select All Toggle */}
              <div className="flex items-center justify-between mb-4 p-3 bg-sage/10 rounded-xl">
                <span className="roomeo-body font-medium text-emerald-primary">
                  Select All ({invitableFriends.length} friends)
                </span>
                <button
                  onClick={handleSelectAll}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedFriends.length === invitableFriends.length
                      ? 'bg-emerald-primary border-emerald-primary text-gold-accent'
                      : 'border-sage hover:border-emerald-primary'
                  }`}
                >
                  {selectedFriends.length === invitableFriends.length && '✓'}
                </button>
              </div>

              {/* Friends List */}
              <div className="space-y-2">
                {invitableFriends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => handleFriendToggle(friend.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-emerald-primary/10 border-2 border-emerald-primary/30'
                        : 'bg-sage/5 hover:bg-sage/10 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full bg-sage/30 bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: friend.profilePicture 
                          ? `url("${friend.profilePicture}")` 
                          : undefined
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="roomeo-body font-medium text-emerald-primary truncate">
                        {friend.name}
                      </p>
                      <p className="text-xs text-emerald-primary/60">
                        Friend
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-emerald-primary border-emerald-primary text-gold-accent'
                        : 'border-sage'
                    }`}>
                      {selectedFriends.includes(friend.id) && '✓'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection Summary */}
              {selectedFriends.length > 0 && (
                <div className="mt-4 p-3 bg-emerald-primary/10 rounded-xl">
                  <p className="roomeo-body text-emerald-primary text-sm">
                    <span className="font-bold">{selectedFriends.length}</span> friend
                    {selectedFriends.length !== 1 ? 's' : ''} selected for invitation
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {invitableFriends.length > 0 && (
          <div className="flex gap-3 p-6 border-t border-sage/20 flex-shrink-0">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 roomeo-button-secondary"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              className="flex-1 roomeo-button-primary"
              disabled={isLoading || selectedFriends.length === 0}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                  Inviting...
                </>
              ) : (
                <>
                  👥 Invite {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}