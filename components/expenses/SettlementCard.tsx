"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SettlementCardProps } from "@/types/expenses"

export default function SettlementCard({ settlement, onApprove, currentUserId }: SettlementCardProps) {
  const isReceiver = currentUserId === settlement.settlement_id // This needs to be fixed in the data structure
  const canApprove = onApprove && settlement.status === 'pending'

  const getStatusColor = () => {
    switch (settlement.status) {
      case 'approved':
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case 'rejected':
        return "bg-red-100 text-red-700 border-red-200"
      case 'pending':
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusText = () => {
    switch (settlement.status) {
      case 'approved':
        return "Approved"
      case 'rejected':
        return "Rejected"
      case 'pending':
        return "Pending Review"
      default:
        return settlement.status
    }
  }

  const getPaymentMethodIcon = () => {
    switch (settlement.payment_method) {
      case 'cash':
        return '💵'
      case 'zelle':
        return '📱'
      case 'venmo':
        return '💸'
      case 'paypal':
        return '🏛️'
      case 'bank_transfer':
        return '🏦'
      default:
        return '💳'
    }
  }

  const getPaymentMethodName = () => {
    switch (settlement.payment_method) {
      case 'cash':
        return 'Cash'
      case 'zelle':
        return 'Zelle'
      case 'venmo':
        return 'Venmo'
      case 'paypal':
        return 'PayPal'
      case 'bank_transfer':
        return 'Bank Transfer'
      default:
        return settlement.payment_method
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-full bg-blue-100 shrink-0 size-12 text-blue-600">
            <span className="text-xl">{getPaymentMethodIcon()}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{settlement.group_name}</h3>
            <p className="text-sm text-gray-600">
              Payment from <span className="font-medium">{settlement.payer_name}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(settlement.created_at)}
            </p>
          </div>
        </div>
        
        <Badge className={`${getStatusColor()} font-medium px-3 py-1`}>
          {getStatusText()}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Amount</p>
          <p className="text-xl font-bold text-gray-900">${settlement.amount.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Payment Method</p>
          <p className="text-sm font-medium text-gray-700 flex items-center justify-center gap-1">
            <span>{getPaymentMethodIcon()}</span>
            {getPaymentMethodName()}
          </p>
        </div>
      </div>

      {settlement.notes && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-blue-700">Note:</span> {settlement.notes}
          </p>
        </div>
      )}

      {settlement.proof_image && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Payment Proof:</p>
          <div className="relative">
            <img 
              src={settlement.proof_image} 
              alt="Payment proof" 
              className="w-full max-w-sm rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(settlement.proof_image, '_blank')}
            />
            <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-1">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-gray-600">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 11a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM9 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM7 3a1 1 0 000 2v1a1 1 0 11-2 0V5a1 1 0 000-2h2zM15 6a1 1 0 100-2h-2a1 1 0 100 2h2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {canApprove && settlement.status === 'pending' && (
        <div className="flex gap-3">
          <Button
            onClick={() => onApprove?.(settlement.settlement_id, false)}
            variant="outline"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
          >
            Reject
          </Button>
          <Button
            onClick={() => onApprove?.(settlement.settlement_id, true)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000]"
          >
            Approve
          </Button>
        </div>
      )}

      {settlement.status === 'approved' && (
        <div className="w-full text-center py-2 px-4 bg-emerald-50 border border-emerald-200 rounded-md">
          <span className="text-emerald-700 font-medium flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Payment Approved
          </span>
        </div>
      )}

      {settlement.status === 'rejected' && (
        <div className="w-full text-center py-2 px-4 bg-red-50 border border-red-200 rounded-md">
          <span className="text-red-700 font-medium flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Payment Rejected
          </span>
        </div>
      )}
    </div>
  )
}