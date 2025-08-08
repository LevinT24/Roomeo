"use client"

import { useState, useEffect } from "react"
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
    { value: 'venmo', label: 'Venmo', icon: '💸' },
    { value: 'paypal', label: 'PayPal', icon: '🏛️' },
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-black tracking-tight">SETTLE UP</h2>
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

          {/* Expense Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-2">{expense.group_name}</h3>
            {expense.group_description && (
              <p className="text-sm text-gray-600 mb-3">{expense.group_description}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Share</p>
                <p className="text-lg font-bold text-gray-900">${expense.amount_owed.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Already Paid</p>
                <p className="text-lg font-bold text-emerald-600">${expense.amount_paid.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded border border-orange-200">
              <p className="text-sm text-gray-600 text-center">Amount to settle</p>
              <p className="text-2xl font-black text-[#F05224] text-center">
                ${remainingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map(method => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, payment_method: method.value }))}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                      formData.payment_method === method.value
                        ? 'border-[#F05224] bg-[#F05224] text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Proof Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Payment Proof (Optional)
              </label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="proof-upload"
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img 
                        src={imagePreview} 
                        alt="Payment proof preview" 
                        className="max-w-full max-h-32 mx-auto rounded-lg shadow-sm"
                      />
                      <p className="text-sm text-gray-600">
                        Click to change image
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-[#F05224]">Upload a screenshot</span> or drag and drop
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Add any notes about this payment..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F05224] focus:border-transparent resize-none"
              />
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
              disabled={isLoading}
              className="flex-1 bg-[#F05224] hover:bg-[#D63E1A] text-white font-semibold border-2 border-black shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000]"
            >
              {isLoading ? 'Submitting...' : `Submit Payment $${remainingAmount.toFixed(2)}`}
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 text-center">
              Your payment will be reviewed by the expense creator before being approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}