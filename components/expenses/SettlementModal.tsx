"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SettleUpModalProps, PaymentMethod } from "@/types/expenses"

export default function SettlementModal({ 
  isOpen, 
  onClose, 
  expense, 
  onSubmitSettlement 
}: SettleUpModalProps) {
  const [formData, setFormData] = useState({
    payment_method: 'cash' as PaymentMethod,
    proof_image: '',
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const remainingAmount = expense.amount_owed - expense.amount_paid

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        payment_method: 'cash',
        proof_image: '',
        notes: ''
      })
      setError('')
      setImageFile(null)
      setImagePreview('')
    }
  }, [isOpen])

  const paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'zelle', label: 'Zelle', icon: '📱' },
    { value: 'venmo', label: 'Venmo', icon: '💳' },
    { value: 'paypal', label: 'PayPal', icon: '💰' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' }
  ]

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be less than 5MB')
      return
    }

    setImageFile(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'settlement_proof')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Failed to upload image')
    }

    const result = await response.json()
    return result.url
  }

  const validateForm = () => {
    if (!formData.payment_method) {
      setError('Payment method is required')
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      let imageUrl = ''
      
      // Upload image if provided
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }

      await onSubmitSettlement({
        group_id: expense.group_id,
        amount: remainingAmount,
        payment_method: formData.payment_method,
        proof_image: imageUrl || undefined,
        notes: formData.notes || undefined
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit settlement')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="roomeo-card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="roomeo-heading text-2xl flex items-center gap-2">
              <span>💳</span> Settle Up
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

          {/* Expense Details */}
          <div className="mb-6 p-5 bg-mint-cream rounded-xl border border-sage/30">
            <h3 className="roomeo-heading text-lg mb-2 flex items-center gap-2">
              <span>🏠</span> {expense.group_name}
            </h3>
            {expense.group_description && (
              <p className="roomeo-body text-emerald-primary/70 text-sm mb-4">{expense.group_description}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="p-3 bg-white rounded-lg border border-sage/20">
                <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-1">Total Share</p>
                <p className="roomeo-heading text-lg text-emerald-primary">${expense.amount_owed.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-sage/20">
                <p className="roomeo-body text-emerald-primary/60 text-xs uppercase tracking-wide mb-1">Already Paid</p>
                <p className="roomeo-heading text-lg text-roomeo-success">${expense.amount_paid.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-gold-accent/10 to-emerald-primary/10 rounded-xl border border-gold-accent/30">
              <p className="roomeo-body text-emerald-primary/70 text-sm text-center mb-2 flex items-center justify-center gap-2">
                <span>💸</span> Amount to settle
              </p>
              <p className="roomeo-heading text-3xl text-emerald-primary text-center">
                ${remainingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div>
              <label className="roomeo-body font-semibold text-emerald-primary mb-4 block flex items-center gap-2">
                <span>💳</span> Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, payment_method: method.value }))}
                    className={`flex items-center gap-3 p-4 rounded-xl roomeo-body font-semibold transition-all duration-300 transform hover:scale-105 ${
                      formData.payment_method === method.value
                        ? 'roomeo-button-primary'
                        : 'roomeo-button-secondary'
                    }`}
                  >
                    <span className="text-lg">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Proof Upload */}
            <div>
              <label className="roomeo-body font-semibold text-emerald-primary mb-4 block flex items-center gap-2">
                <span>🖼️</span> Payment Proof (Optional)
              </label>
              
              <div className="border-2 border-dashed border-sage/40 rounded-xl p-6 text-center hover:border-sage/60 hover:bg-sage/5 transition-all duration-300 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="proof-upload"
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  {imagePreview ? (
                    <div className="space-y-3">
                      <Image 
                        src={imagePreview} 
                        alt="Payment proof preview" 
                        className="max-w-full max-h-32 mx-auto rounded-xl shadow-card border border-sage/30"
                        width={200}
                        height={128}
                      />
                      <p className="roomeo-body text-emerald-primary/60 text-sm">
                        🔄 Click to change image
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-4xl mb-2">📷</div>
                      <div className="roomeo-body text-emerald-primary/70">
                        <span className="font-semibold text-gold-accent">🎆 Upload a screenshot</span> or drag and drop
                      </div>
                      <p className="roomeo-body text-emerald-primary/50 text-xs">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="roomeo-body font-semibold text-emerald-primary mb-3 block flex items-center gap-2">
                <span>📝</span> Notes (Optional)
              </label>
              <textarea
                placeholder="Add any notes about this payment..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-mint-cream border border-sage/30 rounded-xl roomeo-body text-emerald-primary placeholder:text-emerald-primary/50 focus:outline-none focus:ring-2 focus:ring-gold-accent focus:border-transparent resize-none transition-all"
              />
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
              disabled={isLoading}
              className={`flex-1 roomeo-button-primary flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-accent border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <span>💳</span> Submit ${remainingAmount.toFixed(2)}
                </>
              )}
            </button>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-gold-accent/10 border border-gold-accent/20 rounded-xl">
            <p className="roomeo-body text-emerald-primary text-xs text-center flex items-center justify-center gap-2">
              <span>ℹ️</span> Your payment will be reviewed by the room creator before being approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}