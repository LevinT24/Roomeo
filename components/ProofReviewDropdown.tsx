"use client"

import { useState, useEffect } from 'react'
import { Camera, X } from 'lucide-react'
import Image from 'next/image'
import { getPendingSettlements, approveSettlement } from '@/services/expenses'
import { PendingSettlement } from '@/types/expenses'

interface ProofReviewDropdownProps {
  userId: string
}

export default function ProofReviewDropdown({ userId }: ProofReviewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [settlements, setSettlements] = useState<PendingSettlement[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch pending settlements
  const fetchSettlements = async () => {
    try {
      setLoading(true)
      const data = await getPendingSettlements()
      setSettlements(data)
    } catch (error) {
      console.error('Error fetching settlements:', error)
    } finally {
      setLoading(false)
    }
  }

  // Approve/reject settlement
  const handleApproval = async (settlementId: string, approved: boolean) => {
    try {
      await approveSettlement({ settlement_id: settlementId, approved })
      await fetchSettlements() // Refresh list
    } catch (error) {
      console.error('Error processing settlement:', error)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchSettlements()
    }
  }, [userId])

  const proofCount = settlements.length

  return (
    <div className="relative">
      {/* Proof Review Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Camera className="w-6 h-6 text-gray-700" />
        {proofCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gold-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {proofCount > 9 ? '9+' : proofCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Proof Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Payment Proofs</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Proofs List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-accent mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading proofs...</p>
                </div>
              ) : settlements.length === 0 ? (
                <div className="p-8 text-center">
                  <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No pending proofs</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {settlements.map((settlement) => (
                    <div key={settlement.settlement_id} className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {settlement.group_name}
                          </p>
                          <p className="text-gray-600 text-sm">
                            ${settlement.amount.toFixed(2)} from {settlement.payer_name}
                          </p>
                        </div>
                      </div>

                      {/* Proof Image */}
                      {settlement.proof_image && (
                        <div className="mb-3">
                          <Image 
                            src={settlement.proof_image} 
                            alt="Payment proof" 
                            className="w-full max-w-xs rounded-lg border cursor-pointer hover:shadow-lg transition-all"
                            width={300}
                            height={200}
                            onClick={() => window.open(settlement.proof_image, '_blank')}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproval(settlement.settlement_id, false)}
                          className="flex-1 px-3 py-2 text-sm border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          ❌ Reject
                        </button>
                        <button
                          onClick={() => handleApproval(settlement.settlement_id, true)}
                          className="flex-1 px-3 py-2 text-sm bg-emerald-primary text-white hover:bg-emerald-primary/90 rounded-lg transition-colors"
                        >
                          ✅ Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}