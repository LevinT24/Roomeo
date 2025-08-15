"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Mail, MessageCircle, Copy, Check } from "lucide-react"

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

interface InviteResult {
  token: string;
  inviteUrl: string;
  whatsappUrl?: string;
  expiresAt: string;
}

export default function InviteModal({ 
  isOpen, 
  onClose, 
  groupId, 
  groupName 
}: InviteModalProps) {
  const [inviteMethod, setInviteMethod] = useState<'email' | 'whatsapp' | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setInviteMethod(null);
    setRecipientEmail('');
    setRecipientPhone('');
    setCustomMessage('');
    setError('');
    setInviteResult(null);
    setCopiedUrl(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateInvite = async () => {
    if (!inviteMethod) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const payload = {
        groupId,
        inviteMethod,
        ...(inviteMethod === 'email' ? { recipientEmail } : { recipientPhone }),
        ...(customMessage ? { customMessage } : {})
      };
      
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Failed to create invite');
        return;
      }
      
      setInviteResult(data.invite);
      
      // Auto-open WhatsApp if it's a WhatsApp invite
      if (inviteMethod === 'whatsapp' && data.invite.whatsappUrl) {
        window.open(data.invite.whatsappUrl, '_blank');
      }
      
    } catch (err) {
      setError('Failed to create invite. Please try again.');
      console.error('Error creating invite:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Add + prefix if not present
    if (cleaned.length > 0 && !phone.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return phone;
  };

  const isFormValid = () => {
    if (!inviteMethod) return false;
    if (inviteMethod === 'email') return recipientEmail.includes('@');
    if (inviteMethod === 'whatsapp') return recipientPhone.length > 7;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold truncate pr-2">Invite to {groupName}</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="flex-shrink-0 h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {inviteResult ? (
          /* Success State */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Invite Created!</span>
              </div>
              {inviteMethod === 'email' && (
                <p className="text-green-700 text-sm">
                  Email sent to {recipientEmail}
                </p>
              )}
              {inviteMethod === 'whatsapp' && (
                <p className="text-green-700 text-sm">
                  WhatsApp opened with pre-filled message
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share this invite link:
              </label>
              <div className="flex gap-2">
                <Input
                  value={inviteResult.inviteUrl}
                  readOnly
                  className="flex-1 bg-gray-50"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(inviteResult.inviteUrl)}
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Expires {new Date(inviteResult.expiresAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 h-12">
                Send Another
              </Button>
              <Button onClick={handleClose} className="flex-1 h-12">
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Form State */
          <div className="space-y-4">
            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you like to invite them?
              </label>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button
                  onClick={() => setInviteMethod('email')}
                  className={`p-3 md:p-4 border rounded-lg flex flex-col items-center gap-1 md:gap-2 transition-all min-h-[80px] md:min-h-[90px] ${
                    inviteMethod === 'email'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Mail className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                  <span className="text-xs md:text-sm font-medium">Email</span>
                </button>
                <button
                  onClick={() => setInviteMethod('whatsapp')}
                  className={`p-3 md:p-4 border rounded-lg flex flex-col items-center gap-1 md:gap-2 transition-all min-h-[80px] md:min-h-[90px] ${
                    inviteMethod === 'whatsapp'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                  <span className="text-xs md:text-sm font-medium">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Recipient Input */}
            {inviteMethod === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            )}

            {inviteMethod === 'whatsapp' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(formatPhoneNumber(e.target.value))}
                  className="h-12 text-base"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            )}

            {/* Custom Message */}
            {inviteMethod && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <Input
                  placeholder="Hey! Join our group so we can split expenses..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  maxLength={200}
                  className="h-12 text-base"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customMessage.length}/200 characters
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 h-12">
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvite}
                disabled={!isFormValid() || isLoading}
                className="flex-1 h-12"
              >
                {isLoading ? 'Creating...' : (
                  <span className="text-center">
                    <span className="hidden sm:inline">Send {inviteMethod === 'email' ? 'Email' : 'WhatsApp'} Invite</span>
                    <span className="sm:hidden">Send Invite</span>
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}