"use client"

import React, { useState, useReducer, useEffect } from 'react'

// Types
interface Friend {
  id: string
  name: string
  avatar?: string
}

interface Expense {
  id: string
  name: string
  amount: number
  category: string
  emoji: string
  paidBy: string
  paidByName: string
  participants: string[]
  splitAmount: number
  date: Date
}

interface Balance {
  friendId: string
  friendName: string
  amount: number // positive = they owe you, negative = you owe them
}

interface ExpenseState {
  expenses: Expense[]
  friends: Friend[]
  balances: Balance[]
}

// Categories with emojis
const CATEGORIES = [
  { id: 'food', name: 'Food', emoji: '🍕' },
  { id: 'housing', name: 'Housing', emoji: '🏠' },
  { id: 'utilities', name: 'Utilities', emoji: '💡' },
  { id: 'transport', name: 'Transport', emoji: '🚕' },
  { id: 'entertainment', name: 'Fun', emoji: '🎮' },
  { id: 'other', name: 'Other', emoji: '💰' }
]

// Mock friends data
const INITIAL_FRIENDS: Friend[] = [
  { id: '1', name: 'Alex Chen', avatar: '👤' },
  { id: '2', name: 'Sam Rivera', avatar: '👤' },
  { id: '3', name: 'Jordan Kim', avatar: '👤' },
  { id: '4', name: 'Casey Wong', avatar: '👤' }
]

// State reducer
type ExpenseAction = 
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'CALCULATE_BALANCES' }

function expenseReducer(state: ExpenseState, action: ExpenseAction): ExpenseState {
  switch (action.type) {
    case 'ADD_EXPENSE':
      const newExpenses = [...state.expenses, action.payload]
      return {
        ...state,
        expenses: newExpenses,
        balances: calculateBalances(newExpenses, state.friends)
      }
    case 'CALCULATE_BALANCES':
      return {
        ...state,
        balances: calculateBalances(state.expenses, state.friends)
      }
    default:
      return state
  }
}

// Calculate balances between friends
function calculateBalances(expenses: Expense[], friends: Friend[]): Balance[] {
  const balanceMap = new Map<string, number>()
  
  // Initialize balances
  friends.forEach(friend => {
    balanceMap.set(friend.id, 0)
  })
  
  // Calculate from expenses (assuming current user is 'user1')
  expenses.forEach(expense => {
    const splitAmount = expense.amount / expense.participants.length
    
    if (expense.paidBy === 'user1') {
      // User paid, others owe them
      expense.participants.forEach(participantId => {
        if (participantId !== 'user1') {
          const currentBalance = balanceMap.get(participantId) || 0
          balanceMap.set(participantId, currentBalance + splitAmount)
        }
      })
    } else {
      // Someone else paid, user owes them if they were a participant
      if (expense.participants.includes('user1')) {
        const currentBalance = balanceMap.get(expense.paidBy) || 0
        balanceMap.set(expense.paidBy, currentBalance - splitAmount)
      }
    }
  })
  
  return friends
    .map(friend => ({
      friendId: friend.id,
      friendName: friend.name,
      amount: balanceMap.get(friend.id) || 0
    }))
    .filter(balance => Math.abs(balance.amount) > 0.01)
}

// Main Component
export default function ExpenseSplitter() {
  const [state, dispatch] = useReducer(expenseReducer, {
    expenses: [],
    friends: INITIAL_FRIENDS,
    balances: []
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isVisible, setIsVisible] = useState(false)

  // Animation trigger
  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Filter expenses by category
  const filteredExpenses = selectedCategory === 'all' 
    ? state.expenses 
    : state.expenses.filter(expense => expense.category === selectedCategory)

  return (
    <div className="min-h-screen bg-mint-cream font-inter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`text-center mb-8 transition-all duration-1000 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
          <h1 className="font-poppins font-semibold text-4xl text-emerald-primary mb-2">
            💸 Split & Track
          </h1>
          <p className="text-emerald-primary/70 text-lg">Keep your expenses organized with friends</p>
        </div>

        {/* Quick Stats */}
        <QuickStats balances={state.balances} isVisible={isVisible} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Add Expense & Categories */}
          <div className="space-y-6">
            <AddExpenseCard 
              friends={state.friends}
              onAddExpense={(expense) => dispatch({ type: 'ADD_EXPENSE', payload: expense })}
              showForm={showAddForm}
              setShowForm={setShowAddForm}
              isVisible={isVisible}
            />
            <CategoryFilters
              categories={CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              isVisible={isVisible}
            />
          </div>

          {/* Center: Transaction List */}
          <TransactionList 
            expenses={filteredExpenses}
            isVisible={isVisible}
          />

          {/* Right: Friends Balance */}
          <FriendsBalance 
            balances={state.balances}
            isVisible={isVisible}
          />
        </div>
      </div>
    </div>
  )
}

// Quick Stats Component
function QuickStats({ balances, isVisible }: { balances: Balance[], isVisible: boolean }) {
  const totalOwed = balances.filter(b => b.amount < 0).reduce((sum, b) => sum + Math.abs(b.amount), 0)
  const totalToReceive = balances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0)
  const netBalance = totalToReceive - totalOwed

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-white rounded-2xl p-6 shadow-card border border-sage/20 hover:shadow-soft transition-all duration-300">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">💸</span>
          <h3 className="font-poppins font-semibold text-emerald-primary">You Owe</h3>
        </div>
        <p className="text-3xl font-bold text-alert-red">${totalOwed.toFixed(2)}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-card border border-sage/20 hover:shadow-soft transition-all duration-300">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">💰</span>
          <h3 className="font-poppins font-semibold text-emerald-primary">You're Owed</h3>
        </div>
        <p className="text-3xl font-bold text-moss-green">${totalToReceive.toFixed(2)}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-card border border-sage/20 hover:shadow-soft transition-all duration-300">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚖️</span>
          <h3 className="font-poppins font-semibold text-emerald-primary">Net Balance</h3>
        </div>
        <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-moss-green' : 'text-alert-red'}`}>
          ${Math.abs(netBalance).toFixed(2)}
        </p>
      </div>
    </div>
  )
}

// Add Expense Card Component
function AddExpenseCard({ 
  friends, 
  onAddExpense, 
  showForm, 
  setShowForm, 
  isVisible 
}: { 
  friends: Friend[]
  onAddExpense: (expense: Expense) => void
  showForm: boolean
  setShowForm: (show: boolean) => void
  isVisible: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'food',
    selectedFriends: [] as string[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.amount) return

    const category = CATEGORIES.find(c => c.id === formData.category)!
    const expense: Expense = {
      id: Date.now().toString(),
      name: formData.name,
      amount: parseFloat(formData.amount),
      category: formData.category,
      emoji: category.emoji,
      paidBy: 'user1',
      paidByName: 'You',
      participants: ['user1', ...formData.selectedFriends],
      splitAmount: parseFloat(formData.amount) / (formData.selectedFriends.length + 1),
      date: new Date()
    }

    onAddExpense(expense)
    setFormData({ name: '', amount: '', category: 'food', selectedFriends: [] })
    setShowForm(false)
  }

  const toggleFriend = (friendId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFriends: prev.selectedFriends.includes(friendId)
        ? prev.selectedFriends.filter(id => id !== friendId)
        : [...prev.selectedFriends, friendId]
    }))
  }

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-card border border-sage/20 transition-all duration-1000 delay-300 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-poppins font-semibold text-xl text-emerald-primary flex items-center gap-2">
          <span>✨</span> Add Expense
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-primary text-gold-accent px-4 py-2 rounded-xl font-semibold hover:bg-emerald-primary/90 hover:scale-105 transition-all duration-300"
        >
          {showForm ? '✕' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
          <input
            type="text"
            placeholder="What did you spend on?"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 bg-mint-cream border border-sage/30 rounded-xl text-emerald-primary placeholder:text-emerald-primary/50 focus:outline-none focus:ring-2 focus:ring-gold-accent transition-all"
          />

          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-primary/60">$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full pl-8 pr-4 py-3 bg-mint-cream border border-sage/30 rounded-xl text-emerald-primary placeholder:text-emerald-primary/50 focus:outline-none focus:ring-2 focus:ring-gold-accent transition-all"
            />
          </div>

          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-3 bg-mint-cream border border-sage/30 rounded-xl text-emerald-primary focus:outline-none focus:ring-2 focus:ring-gold-accent transition-all"
          >
            {CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>
                {category.emoji} {category.name}
              </option>
            ))}
          </select>

          <div>
            <p className="text-emerald-primary font-semibold mb-3 flex items-center gap-2">
              <span>🤝</span> Split with:
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {friends.map(friend => (
                <label
                  key={friend.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-sage/10 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedFriends.includes(friend.id)}
                    onChange={() => toggleFriend(friend.id)}
                    className="w-4 h-4 text-emerald-primary border-sage rounded focus:ring-gold-accent"
                  />
                  <span className="text-lg">{friend.avatar}</span>
                  <span className="text-emerald-primary font-medium">{friend.name}</span>
                </label>
              ))}
            </div>
          </div>

          {formData.selectedFriends.length > 0 && formData.amount && (
            <div className="p-3 bg-gold-accent/10 border border-gold-accent/20 rounded-xl">
              <p className="text-emerald-primary text-sm">
                <span className="font-semibold">Split:</span> ${(parseFloat(formData.amount || '0') / (formData.selectedFriends.length + 1)).toFixed(2)} per person
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!formData.name || !formData.amount}
            className="w-full bg-emerald-primary text-gold-accent py-3 rounded-xl font-semibold hover:bg-emerald-primary/90 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            💸 Add Expense
          </button>
        </form>
      )}
    </div>
  )
}

// Category Filters Component
function CategoryFilters({ 
  categories, 
  selectedCategory, 
  onSelectCategory, 
  isVisible 
}: { 
  categories: typeof CATEGORIES
  selectedCategory: string
  onSelectCategory: (category: string) => void
  isVisible: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-card border border-sage/20 transition-all duration-1000 delay-400 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
      <h3 className="font-poppins font-semibold text-lg text-emerald-primary mb-4 flex items-center gap-2">
        <span>📋</span> Categories
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 ${
            selectedCategory === 'all'
              ? 'bg-emerald-primary text-gold-accent shadow-soft'
              : 'bg-sage/20 text-emerald-primary hover:bg-sage/30'
          }`}
        >
          ✨ All
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 ${
              selectedCategory === category.id
                ? 'bg-emerald-primary text-gold-accent shadow-soft'
                : 'bg-sage/20 text-emerald-primary hover:bg-sage/30'
            }`}
          >
            {category.emoji} {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// Transaction List Component
function TransactionList({ expenses, isVisible }: { expenses: Expense[], isVisible: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-card border border-sage/20 transition-all duration-1000 delay-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
      <h2 className="font-poppins font-semibold text-xl text-emerald-primary mb-4 flex items-center gap-2">
        <span>👁️</span> Recent Activity
      </h2>
      
      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">💸</div>
          <p className="text-emerald-primary/60">No expenses yet</p>
          <p className="text-emerald-primary/40 text-sm">Start by adding your first expense!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {expenses.map((expense, index) => (
            <div
              key={expense.id}
              className="p-4 border border-sage/20 rounded-xl hover:bg-sage/5 hover:shadow-card transition-all duration-300 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{expense.emoji}</span>
                  <div>
                    <h4 className="font-semibold text-emerald-primary">{expense.name}</h4>
                    <p className="text-emerald-primary/60 text-sm">
                      Paid by {expense.paidByName} • Split {expense.participants.length} ways
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-primary text-lg">
                    ${expense.amount.toFixed(2)}
                  </p>
                  <p className="text-emerald-primary/60 text-sm">
                    ${expense.splitAmount.toFixed(2)} each
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Friends Balance Component
function FriendsBalance({ balances, isVisible }: { balances: Balance[], isVisible: boolean }) {
  const owedByFriends = balances.filter(b => b.amount > 0)
  const owedToFriends = balances.filter(b => b.amount < 0)

  return (
    <div className={`space-y-6 transition-all duration-1000 delay-600 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
      {/* You're Owed */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-sage/20">
        <h3 className="font-poppins font-semibold text-lg text-emerald-primary mb-4 flex items-center gap-2">
          <span>💰</span> You're Owed
        </h3>
        {owedByFriends.length === 0 ? (
          <p className="text-emerald-primary/60 text-center py-6">All settled up! 🎉</p>
        ) : (
          <div className="space-y-3">
            {owedByFriends.map(balance => (
              <div
                key={balance.friendId}
                className="flex items-center justify-between p-3 bg-moss-green/10 border border-moss-green/20 rounded-xl hover:bg-moss-green/20 hover:shadow-card transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <span className="font-semibold text-emerald-primary">{balance.friendName}</span>
                </div>
                <span className="font-bold text-moss-green">
                  +${balance.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* You Owe */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-sage/20">
        <h3 className="font-poppins font-semibold text-lg text-emerald-primary mb-4 flex items-center gap-2">
          <span>💸</span> You Owe
        </h3>
        {owedToFriends.length === 0 ? (
          <p className="text-emerald-primary/60 text-center py-6">Nothing to pay! ✨</p>
        ) : (
          <div className="space-y-3">
            {owedToFriends.map(balance => (
              <div
                key={balance.friendId}
                className="flex items-center justify-between p-3 bg-alert-red/10 border border-alert-red/20 rounded-xl hover:bg-alert-red/20 hover:shadow-card transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <span className="font-semibold text-emerald-primary">{balance.friendName}</span>
                </div>
                <span className="font-bold text-alert-red">
                  -${Math.abs(balance.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}