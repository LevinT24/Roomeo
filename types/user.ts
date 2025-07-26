export interface User {
  id: string
  email: string
  name: string
  profilePicture: string
  age?: number
  bio?: string
  preferences?: {
    smoking: boolean
    drinking: boolean
    vegetarian: boolean
    pets: boolean
  }
  userType?: "owner" | "seeker" // owner = has place, seeker = looking for place
  location?: string
  budget?: number
  createdAt: Date
  updatedAt: Date
}

export interface Match {
  id: string
  user1Id: string
  user2Id: string
  createdAt: Date
}

export interface Swipe {
  id: string
  swiperId: string
  swipedUserId: string
  liked: boolean
  createdAt: Date
}

export interface MarketplaceItem {
  id: string
  sellerId: string
  title: string
  description: string
  price: number
  category: string
  location: string
  images: string[]
  createdAt: Date
}

export interface Expense {
  id: string
  title: string
  amount: number
  paidBy: string
  splitBetween: string[]
  splitType: "equal" | "unequal"
  splitAmounts?: { [userId: string]: number }
  createdAt: Date
}
