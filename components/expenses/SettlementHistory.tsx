"use client"

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, TrendingUp, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSettlementHistory, exportExpenseReport } from '@/services/expenses'
import LoadingSpinner from '@/components/LoadingSpinner'

interface SettlementHistoryProps {
  isOpen: boolean
  onClose: () => void
}

interface HistoryItem {
  id: string
  group_name: string
  amount: number
  payment_method: string
  status: 'approved' | 'rejected' | 'pending'
  created_at: string
  approved_at?: string
  type: 'sent' | 'received'
  payer_name?: string
  receiver_name?: string
}

interface AnalyticsData {
  total_paid: number
  total_received: number
  total_transactions: number
  average_amount: number
  most_used_method: string
  monthly_summary: {
    month: string
    paid: number
    received: number
  }[]
}

export default function SettlementHistory({ isOpen, onClose }: SettlementHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchSettlementHistory()
    }
  }, [isOpen])

  const fetchSettlementHistory = async () => {
    setLoading(true)
    setError('')
    
    try {
      const data = await getSettlementHistory()
      setHistory(data.history || [])
      setAnalytics(data.analytics || null)
    } catch (err) {
      console.error('Error fetching settlement history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (filterType !== 'all' && item.type !== filterType) return false
    return true
  })

  const handleExportReport = async () => {
    try {
      await exportExpenseReport('pdf', filterStatus, filterType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'sent' ? '📤' : '📥'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-black text-black tracking-tight">SETTLEMENT HISTORY</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-bold mb-4">{error}</p>
              <Button onClick={fetchSettlementHistory} className="bg-[#F05224] hover:bg-[#F05224]/80">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analytics Cards */}
              {analytics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <TrendingUp className="w-4 sm:w-6 h-4 sm:h-6 text-green-600 mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs sm:text-sm text-green-600 font-bold">TOTAL RECEIVED</p>
                      <p className="text-sm sm:text-xl font-black text-green-700">{formatCurrency(analytics.total_received)}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <DollarSign className="w-4 sm:w-6 h-4 sm:h-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs sm:text-sm text-blue-600 font-bold">TOTAL PAID</p>
                      <p className="text-sm sm:text-xl font-black text-blue-700">{formatCurrency(analytics.total_paid)}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-purple-200 bg-purple-50">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <Calendar className="w-4 sm:w-6 h-4 sm:h-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs sm:text-sm text-purple-600 font-bold">TRANSACTIONS</p>
                      <p className="text-sm sm:text-xl font-black text-purple-700">{analytics.total_transactions}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-orange-200 bg-orange-50">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <TrendingUp className="w-4 sm:w-6 h-4 sm:h-6 text-orange-600 mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs sm:text-sm text-orange-600 font-bold">AVG AMOUNT</p>
                      <p className="text-sm sm:text-xl font-black text-orange-700">{formatCurrency(analytics.average_amount)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters & Export */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 border rounded-lg text-xs sm:text-sm font-bold flex-1 sm:flex-none"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-2 border rounded-lg text-xs sm:text-sm font-bold flex-1 sm:flex-none"
                  >
                    <option value="all">All Types</option>
                    <option value="sent">Sent</option>
                    <option value="received">Received</option>
                  </select>
                </div>

                <Button
                  onClick={handleExportReport}
                  className="bg-[#F05224] hover:bg-[#F05224]/80 text-white w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>

              {/* History List */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">No settlements match your filters</p>
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <Card key={item.id} className="border-2 border-gray-200">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="text-xl sm:text-2xl">{getTypeIcon(item.type)}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-xs sm:text-sm text-black truncate">{item.group_name}</h3>
                              <p className="text-xs text-gray-600 font-bold truncate">
                                {item.type === 'sent' ? `To: ${item.receiver_name}` : `From: ${item.payer_name}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(item.created_at)} • {item.payment_method}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right sm:text-left flex sm:block items-center justify-between sm:justify-end">
                            <p className={`text-base sm:text-lg font-black ${item.type === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                              {item.type === 'sent' ? '-' : '+'}{formatCurrency(item.amount)}
                            </p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)} mt-0 sm:mt-1`}>
                              {item.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}