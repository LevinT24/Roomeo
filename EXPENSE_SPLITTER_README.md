# 💸 Complete Expense Splitter Interface

A **modern, Gen Z-friendly expense-splitting interface** inspired by Splitwise, built with **Next.js + TypeScript + Tailwind CSS**.

## 🎯 **Features**

### ✨ **Design System**
- **Colors**: Emerald Primary (#006D5B), Gold Accent (#D4AF37), Sage (#B7C8B5), Mint Cream (#F2F5F1), Moss Green (#44C76F), Alert Red (#FF5C5C)
- **Typography**: Poppins (headings), Inter (body text)
- **Modern UI**: Soft shadows, rounded corners, smooth transitions, addictive feel
- **Responsive**: Mobile-first design with grid-cols-1 → lg:grid-cols-3

### 🏗️ **Components Included**

#### 1. **Add Expense Form**
- Name, amount, category selection with emojis
- Friend selection with real-time split calculation
- Visual feedback and validation
- Categories: 🍕 Food, 🏠 Housing, 💡 Utilities, 🚕 Transport, 🎮 Fun, 💰 Other

#### 2. **Quick Stats Dashboard**
- You Owe, You're Owed, Net Balance
- Color-coded amounts (red for debt, green for credit)
- Animated counters and hover effects

#### 3. **Transaction List**
- All expenses with emoji categories
- Shows payer, amount, split details
- Smooth hover animations and transitions
- Real-time updates

#### 4. **Friends Balance Summary**
- Two sections: "You're Owed" and "You Owe"
- Automatic balance calculations
- Click interactions with hover effects
- Color-coded balances

#### 5. **Category Filters**
- Rounded chip buttons with emojis
- Active/inactive states with proper styling
- Smooth transitions and hover effects

### 🎨 **Visual Elements**
- **Emojis**: 🍕🏠💡🚕🎮💰👤🤝⚖️✨📋👁️💸✏️
- **Animations**: fade-in, slide-up, scroll animations
- **Interactions**: Hover effects, click feedback, loading states
- **Layout**: Consistent padding, rounded corners, soft shadows

## 🚀 **Getting Started**

### 1. **View the Demo**
```bash
# Your server is already running at:
http://localhost:3002/expense-demo
```

### 2. **Use in Your Project**
```tsx
import ExpenseSplitter from '@/components/ExpenseSplitter'

export default function ExpensePage() {
  return <ExpenseSplitter />
}
```

### 3. **Component Structure**
```
ExpenseSplitter/
├── QuickStats          # Dashboard overview
├── AddExpenseCard      # Add new expenses
├── CategoryFilters     # Filter by category
├── TransactionList     # Recent activity
└── FriendsBalance      # Balance summary
```

## 🎯 **Functionality**

### ✅ **Core Features**
- ✅ Add expenses with friend selection
- ✅ Real-time split calculation
- ✅ Automatic balance tracking
- ✅ Category filtering
- ✅ Responsive design
- ✅ Smooth animations
- ✅ TypeScript support
- ✅ Modern UI/UX

### 💡 **State Management**
- Uses `useReducer` for complex state logic
- Real-time balance calculations
- Immutable state updates
- TypeScript interfaces for type safety

### 🎨 **Styling**
- Tailwind CSS classes throughout
- Custom design system colors
- Responsive breakpoints
- Hover and focus states
- Smooth transitions

## 📱 **Responsive Design**

```css
/* Mobile First */
grid-cols-1           /* Mobile: Single column */
lg:grid-cols-3        /* Desktop: Three columns */
gap-6                 /* Consistent spacing */
px-4 py-8             /* Mobile padding */
lg:px-12 xl:px-20     /* Desktop padding */
```

## 🎭 **Component Examples**

### **Adding an Expense**
1. Click "Add" button
2. Fill in expense name and amount
3. Select category (🍕 Food, 🏠 Housing, etc.)
4. Choose friends to split with
5. See real-time split calculation
6. Submit to add to transaction list

### **Viewing Balances**
- **Green amounts**: Money you're owed
- **Red amounts**: Money you owe
- **Net balance**: Overall position
- Click on friend cards for interactions

### **Filtering Transactions**
- Use category chips to filter
- ✨ All shows everything
- 🍕 Food, 🏠 Housing, 💡 Utilities, etc.
- Smooth transitions between filters

## 🛠️ **Technical Details**

### **TypeScript Interfaces**
```typescript
interface Expense {
  id: string
  name: string
  amount: number
  category: string
  emoji: string
  paidBy: string
  participants: string[]
  splitAmount: number
  date: Date
}

interface Balance {
  friendId: string
  friendName: string
  amount: number // positive = owed to you, negative = you owe
}
```

### **State Management**
```typescript
// Uses useReducer for complex state logic
const [state, dispatch] = useReducer(expenseReducer, initialState)

// Actions
dispatch({ type: 'ADD_EXPENSE', payload: expense })
dispatch({ type: 'CALCULATE_BALANCES' })
```

### **Animations**
```css
/* Tailwind CSS animations */
animate-fade-in      /* Fade in on load */
animate-slide-up     /* Slide up with delay */
animate-on-scroll    /* Staggered scroll animations */
transition-all       /* Smooth transitions */
hover:scale-105      /* Hover scaling */
```

## 🎨 **Color Usage**

| Color | Usage | Example |
|-------|-------|---------|
| **Emerald Primary** | Headers, main text | `text-emerald-primary` |
| **Gold Accent** | Buttons, highlights | `bg-emerald-primary text-gold-accent` |
| **Sage** | Secondary elements | `bg-sage text-emerald-primary` |
| **Mint Cream** | Background, inputs | `bg-mint-cream` |
| **Moss Green** | Success states | `text-moss-green` |
| **Alert Red** | Error states, debt | `text-alert-red` |

## 📦 **Ready to Copy**

The complete `ExpenseSplitter.tsx` component is fully functional and ready to use in any Next.js project. It includes:

- ✅ All TypeScript interfaces
- ✅ Complete component logic
- ✅ Tailwind CSS styling
- ✅ Responsive design
- ✅ Smooth animations
- ✅ State management
- ✅ Real-time calculations

## 🎯 **Demo URL**
Visit: **http://localhost:3002/expense-demo** to see the complete interface in action!

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**