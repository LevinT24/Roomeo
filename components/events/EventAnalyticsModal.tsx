"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { EventWithDetails } from "@/types/events"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface EventAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventWithDetails
  currentUserId: string
}

interface CategoryData {
  name: string
  value: number
  percentage: number
  color: string
}

interface MemberData {
  name: string
  spent: number
  owes: number
  isCurrentUser: boolean
}

interface TimeData {
  date: string
  amount: number
  cumulative: number
}

interface InsightData {
  totalPerPerson: number
  averageExpense: number
  largestCategory: string
  totalSpent: number
  memberCount: number
}

const CATEGORY_COLORS = {
  'Food': '#44C76F',
  'Hotel': '#004D40', 
  'Transport': '#D4AF37',
  'Entertainment': '#B7C8B5',
  'Shopping': '#8B9A89',
  'Other': '#F2F5F1'
}

const CATEGORY_KEYWORDS = {
  'Food': ['food', 'restaurant', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'drink', 'coffee', 'pizza', 'burger'],
  'Hotel': ['hotel', 'accommodation', 'room', 'stay', 'booking', 'airbnb', 'lodge', 'resort'],
  'Transport': ['uber', 'taxi', 'gas', 'fuel', 'flight', 'train', 'bus', 'transport', 'parking', 'rental'],
  'Entertainment': ['movie', 'show', 'concert', 'game', 'activity', 'tour', 'attraction', 'ticket'],
  'Shopping': ['shop', 'store', 'buy', 'purchase', 'market', 'mall', 'clothes', 'souvenir']
}

export default function EventAnalyticsModal({ isOpen, onClose, event, currentUserId }: EventAnalyticsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'members' | 'timeline'>('overview')

  const analyticsData = useMemo(() => {
    // Process all rooms data
    const categoryTotals = new Map<string, number>()
    const memberTotals = new Map<string, { spent: number, owes: number, name: string }>()
    const timeData: Array<{ date: string, amount: number }> = []
    
    let totalEventSpent = 0

    // Process each room
    event.rooms.forEach(room => {
      totalEventSpent += room.total_amount

      // Categorize expense based on room name and description
      const roomText = `${room.group_name} ${room.group_description || ''}`.toLowerCase()
      let category = 'Other'
      
      for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => roomText.includes(keyword))) {
          category = cat
          break
        }
      }

      // Update category totals
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + room.total_amount)

      // Update time data
      timeData.push({
        date: room.created_at,
        amount: room.total_amount
      })

      // Process member data
      if (room.participants) {
        room.participants.forEach(participant => {
          const memberId = participant.user_id
          const memberName = participant.name
          
          if (!memberTotals.has(memberId)) {
            memberTotals.set(memberId, { spent: 0, owes: 0, name: memberName })
          }
          
          const memberData = memberTotals.get(memberId)!
          
          // If this participant is the creator, they "spent" the money
          if (participant.user_id === room.created_by_id) {
            memberData.spent += room.total_amount
          }
          
          // Calculate what they owe
          const owes = Math.max(0, participant.amount_owed - participant.amount_paid)
          memberData.owes += owes
        })
      }
    })

    // Prepare category data for pie chart
    const categoryData: CategoryData[] = Array.from(categoryTotals.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: totalEventSpent > 0 ? Math.round((value / totalEventSpent) * 100) : 0,
      color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other
    })).sort((a, b) => b.value - a.value)

    // Prepare member data for bar chart
    const memberData: MemberData[] = Array.from(memberTotals.entries()).map(([userId, data]) => ({
      name: userId === currentUserId ? 'You' : data.name,
      spent: data.spent,
      owes: data.owes,
      isCurrentUser: userId === currentUserId
    })).sort((a, b) => b.spent - a.spent)

    // Prepare time data for line chart
    const sortedTimeData = timeData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item, index, arr) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: item.amount,
        cumulative: arr.slice(0, index + 1).reduce((sum, curr) => sum + curr.amount, 0)
      }))

    // Prepare insights
    const insights: InsightData = {
      totalPerPerson: event.members.length > 0 ? totalEventSpent / event.members.length : 0,
      averageExpense: event.rooms.length > 0 ? totalEventSpent / event.rooms.length : 0,
      largestCategory: categoryData[0]?.name || 'N/A',
      totalSpent: totalEventSpent,
      memberCount: event.members.length
    }

    return {
      categoryData,
      memberData,
      timeData: sortedTimeData,
      insights
    }
  }, [event, currentUserId])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-sage/20">
          <p className="roomeo-body text-sm text-emerald-primary font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="roomeo-body text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-mint-cream rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-fade-in shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage/20 flex-shrink-0">
          <div>
            <h2 className="roomeo-heading text-2xl text-emerald-primary">
              📊 Analytics & Insights
            </h2>
            <p className="roomeo-body text-emerald-primary/70 text-sm">
              Visual breakdown of spending for &quot;{event.name}&quot;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-primary/70 hover:text-emerald-primary hover:bg-sage/20 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-sage/20 flex-shrink-0">
          <div className="flex gap-2">
            {[
              { key: 'overview', label: '📋 Overview', icon: '📋' },
              { key: 'categories', label: '🥘 Categories', icon: '🥘' },
              { key: 'members', label: '👥 Members', icon: '👥' },
              { key: 'timeline', label: '📈 Timeline', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-emerald-primary text-gold-accent shadow-md'
                    : 'bg-sage/10 text-emerald-primary hover:bg-sage/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Insights Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/60 p-4 rounded-xl shadow-sm text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <p className="text-xs text-emerald-primary/60 mb-1">Total Spent</p>
                  <p className="roomeo-heading text-xl text-emerald-primary">
                    ${analyticsData.insights.totalSpent.toFixed(0)}
                  </p>
                </div>
                <div className="bg-white/60 p-4 rounded-xl shadow-sm text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <p className="text-xs text-emerald-primary/60 mb-1">Per Person</p>
                  <p className="roomeo-heading text-xl text-emerald-primary">
                    ${analyticsData.insights.totalPerPerson.toFixed(0)}
                  </p>
                </div>
                <div className="bg-white/60 p-4 rounded-xl shadow-sm text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <p className="text-xs text-emerald-primary/60 mb-1">Avg Expense</p>
                  <p className="roomeo-heading text-xl text-emerald-primary">
                    ${analyticsData.insights.averageExpense.toFixed(0)}
                  </p>
                </div>
                <div className="bg-white/60 p-4 rounded-xl shadow-sm text-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <p className="text-xs text-emerald-primary/60 mb-1">Top Category</p>
                  <p className="roomeo-heading text-lg text-emerald-primary">
                    {analyticsData.insights.largestCategory}
                  </p>
                </div>
              </div>

              {/* Quick Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/60 p-4 rounded-xl shadow-sm">
                  <h4 className="roomeo-heading text-lg text-emerald-primary mb-4 text-center">
                    Category Breakdown
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={(entry: CategoryData) => `${entry.percentage}%`}
                      >
                        {analyticsData.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={CustomTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white/60 p-4 rounded-xl shadow-sm">
                  <h4 className="roomeo-heading text-lg text-emerald-primary mb-4 text-center">
                    Member Spending
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.memberData.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#B7C8B5" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#004D40" fontSize={12} />
                      <YAxis stroke="#004D40" fontSize={12} />
                      <Tooltip content={CustomTooltip} />
                      <Bar dataKey="spent" fill="#44C76F" name="Spent" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="bg-white/60 p-6 rounded-xl shadow-sm">
                <h4 className="roomeo-heading text-xl text-emerald-primary mb-6 text-center">
                  🥘 Spending by Category
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        dataKey="value"
                        label={(entry: CategoryData) => `${entry.name}\n${entry.percentage}%`}
                      >
                        {analyticsData.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={CustomTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    <h5 className="roomeo-heading text-lg text-emerald-primary mb-4">Category Details</h5>
                    {analyticsData.categoryData.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="roomeo-body font-medium text-emerald-primary">
                            {category.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="roomeo-body font-bold text-emerald-primary">
                            ${category.value.toFixed(2)}
                          </p>
                          <p className="text-xs text-emerald-primary/60">
                            {category.percentage}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white/60 p-6 rounded-xl shadow-sm">
              <h4 className="roomeo-heading text-xl text-emerald-primary mb-6 text-center">
                👥 Member Analysis
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.memberData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B7C8B5" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#004D40"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#004D40" fontSize={12} />
                  <Tooltip content={CustomTooltip} />
                  <Bar dataKey="spent" fill="#44C76F" name="Spent" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="owes" fill="#D4AF37" name="Owes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white/60 p-6 rounded-xl shadow-sm">
              <h4 className="roomeo-heading text-xl text-emerald-primary mb-6 text-center">
                📈 Spending Timeline
              </h4>
              {analyticsData.timeData.length > 1 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.timeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#B7C8B5" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#004D40" fontSize={12} />
                    <YAxis stroke="#004D40" fontSize={12} />
                    <Tooltip content={CustomTooltip} />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#44C76F" 
                      strokeWidth={3}
                      dot={{ fill: '#44C76F', strokeWidth: 2, r: 6 }}
                      name="Cumulative"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#D4AF37" 
                      strokeWidth={2}
                      dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                      name="Individual"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-emerald-primary/60">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📈</div>
                    <p>Timeline needs multiple expenses to show trends</p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#44C76F] rounded-full"></div>
                  <span className="text-emerald-primary/70">Cumulative Spending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#D4AF37] rounded-full"></div>
                  <span className="text-emerald-primary/70">Individual Expenses</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center p-6 border-t border-sage/20 flex-shrink-0">
          <Button
            onClick={onClose}
            className="roomeo-button-primary px-8"
          >
            Close Analytics
          </Button>
        </div>
      </div>
    </div>
  )
}