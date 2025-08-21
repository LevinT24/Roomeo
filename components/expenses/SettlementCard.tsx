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
        return "bg-roomeo-success/10 text-roomeo-success border-roomeo-success/20"
      case 'rejected':
        return "bg-roomeo-danger/10 text-roomeo-danger border-roomeo-danger/20"
      case 'pending':
        return "bg-gold-accent/10 text-gold-accent border-gold-accent/20"
      default:
        return "bg-sage/10 text-emerald-primary border-sage/20"
    }
  }

  const getStatusText = () => {
    switch (settlement.status) {
      case 'approved':
        return "✅ Approved"
      case 'rejected':
        return "❌ Rejected"
      case 'pending':
        return "⏳ Pending Review"
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
        return '💳'
      case 'paypal':
        return '💰'
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
    <div className="roomeo-card p-6 hover:bg-sage/5 animate-slide-up">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-xl bg-emerald-primary shrink-0 size-14">
            <span className="text-2xl">{getPaymentMethodIcon()}</span>
          </div>
          <div>
            <h3 className="roomeo-heading text-lg">{settlement.group_name}</h3>
            <p className="roomeo-body text-emerald-primary/70 text-sm">
              Payment from <span className="font-semibold text-emerald-primary">{settlement.payer_name}</span>
            </p>
            <p className="roomeo-body text-emerald-primary/50 text-xs mt-1">
              {formatDate(settlement.created_at)}
            </p>
          </div>
        </div>
        
        <div className={`${getStatusColor()} font-medium px-3 py-1.5 rounded-full text-xs`}>
          {getStatusText()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-mint-cream rounded-xl border border-sage/20">
        <div className="text-center">
          <p className="roomeo-body text-emerald-primary/60 text-sm">💸 Amount</p>
          <p className="roomeo-heading text-2xl text-emerald-primary">${settlement.amount.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="roomeo-body text-emerald-primary/60 text-sm">💳 Payment Method</p>
          <p className="roomeo-body text-sm font-semibold text-emerald-primary flex items-center justify-center gap-2">
            <span className="text-lg">{getPaymentMethodIcon()}</span>
            {getPaymentMethodName()}
          </p>
        </div>
      </div>

      {settlement.notes && (
        <div className="mb-5 p-4 bg-gold-accent/10 border border-gold-accent/20 rounded-xl">
          <p className="roomeo-body text-emerald-primary text-sm">
            <span className="font-semibold text-gold-accent">📝 Note:</span> {settlement.notes}
          </p>
        </div>
      )}

      {settlement.proof_image && (
        <div className="mb-5">
          <p className="roomeo-body text-emerald-primary/60 text-sm mb-3 flex items-center gap-2">
            <span>🖼️</span> Payment Proof:
          </p>
          <div className="relative">
            <img 
              src={settlement.proof_image} 
              alt="Payment proof" 
              className="w-full max-w-sm rounded-xl border border-sage/30 shadow-card cursor-pointer hover:shadow-soft transition-all duration-300 transform hover:scale-105"
              onClick={() => window.open(settlement.proof_image, '_blank')}
            />
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-soft">
              <span className="text-emerald-primary text-sm">🔍</span>
            </div>
          </div>
        </div>
      )}

      {canApprove && settlement.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={() => onApprove?.(settlement.settlement_id, false)}
            className="flex-1 border-2 border-roomeo-danger/30 text-roomeo-danger bg-roomeo-danger/5 hover:bg-roomeo-danger/10 rounded-xl px-6 py-3 font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>❌</span> Reject
          </button>
          <button
            onClick={() => onApprove?.(settlement.settlement_id, true)}
            className="flex-1 roomeo-button-primary flex items-center justify-center gap-2"
          >
            <span>✅</span> Approve
          </button>
        </div>
      )}

      {settlement.status === 'approved' && (
        <div className="w-full text-center py-4 px-6 bg-roomeo-success/10 border border-roomeo-success/20 rounded-xl">
          <span className="roomeo-body text-roomeo-success font-semibold flex items-center justify-center gap-2 text-lg">
            <span className="text-2xl">🎉</span>
            Payment Approved!
          </span>
        </div>
      )}

      {settlement.status === 'rejected' && (
        <div className="w-full text-center py-4 px-6 bg-roomeo-danger/10 border border-roomeo-danger/20 rounded-xl">
          <span className="roomeo-body text-roomeo-danger font-semibold flex items-center justify-center gap-2 text-lg">
            <span className="text-2xl">😢</span>
            Payment Rejected
          </span>
        </div>
      )}
    </div>
  )
}