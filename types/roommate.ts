// types/roommate.ts - Roommate matching system types

export type UserRole = 'seeker' | 'provider'

export type RoomType = 'private' | 'shared' | 'studio' | 'apartment'

export type LeaseDuration = '6_months' | '1_year' | 'flexible' | 'month_to_month'

export type YesNoOccasionally = 'yes' | 'no' | 'occasionally'

export type YesNoNegotiable = 'yes' | 'no' | 'negotiable'

export type MatchType = 'like' | 'pass' | 'super_like'

export interface RoommateUser {
  id: string
  email: string
  name: string
  profilepicture?: string
  user_role?: UserRole
  profile_completed: boolean
  
  // Profile fields
  age?: number
  gender?: string
  profession?: string
  bio?: string
  hobbies?: string[]
  religion?: string
  ethnicity?: string
  smoking?: YesNoOccasionally
  drinking?: YesNoOccasionally
  pets?: YesNoNegotiable
  budget_min?: number
  budget_max?: number
  location?: string
  preferences?: Record<string, any>
  
  created_at: string
  updated_at: string
}

export interface RoomImage {
  id: string
  user_id: string
  image_url: string
  image_order: number
  caption?: string
  uploaded_at: string
}

export interface RoomDetails {
  id: string
  user_id: string
  room_type: RoomType
  rent_amount: number
  deposit_amount?: number
  available_from?: string
  lease_duration?: LeaseDuration
  furnished: boolean
  utilities_included: boolean
  amenities?: string[]
  house_rules?: string[]
  description?: string
  address: string
  neighborhood?: string
  created_at: string
  updated_at: string
}

export interface SeekerPreferences {
  id: string
  user_id: string
  preferred_gender?: string
  age_range_min?: number
  age_range_max?: number
  preferred_location?: string
  max_budget?: number
  preferred_room_type?: RoomType
  lifestyle_preferences?: Record<string, any>
  deal_breakers?: string[]
  created_at: string
  updated_at: string
}

export interface UserMatch {
  id: string
  user_id: string
  target_user_id: string
  match_type: MatchType
  created_at: string
}

// Extended user type for profile cards
export interface RoommateProfile extends RoommateUser {
  room_images?: RoomImage[]
  room_details?: RoomDetails
  seeker_preferences?: SeekerPreferences
  is_mutual_match?: boolean
  distance?: number
}

// Form data types
export interface ProfileFormData {
  name: string
  age: number
  gender: string
  profession: string
  bio: string
  hobbies: string[]
  religion: string
  ethnicity: string
  smoking: YesNoOccasionally
  drinking: YesNoOccasionally
  pets: YesNoNegotiable
  budget_min?: number
  budget_max?: number
  location: string
  preferences?: Record<string, any>
}

export interface RoomDetailsFormData {
  room_type: RoomType
  rent_amount: number
  deposit_amount?: number
  available_from?: string
  lease_duration?: LeaseDuration
  furnished: boolean
  utilities_included: boolean
  amenities: string[]
  house_rules: string[]
  description?: string
  address: string
  neighborhood?: string
}

export interface SeekerPreferencesFormData {
  preferred_gender?: string
  age_range_min?: number
  age_range_max?: number
  preferred_location?: string
  max_budget?: number
  preferred_room_type?: RoomType
  lifestyle_preferences?: Record<string, any>
  deal_breakers: string[]
}

// API Response types
export interface ProfileSetupResponse {
  success: boolean
  user?: RoommateUser
  error?: string
  validation_errors?: Record<string, string>
}

export interface DiscoverProfilesResponse {
  success: boolean
  profiles?: RoommateProfile[]
  error?: string
  has_more?: boolean
  page?: number
}

export interface MatchActionResponse {
  success: boolean
  is_mutual_match?: boolean
  match_id?: string
  error?: string
}

// Constants
export const ROOM_TYPES = [
  { value: 'private', label: 'Private Room' },
  { value: 'shared', label: 'Shared Room' },
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Entire Apartment' }
] as const

export const LEASE_DURATIONS = [
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'month_to_month', label: 'Month to Month' },
  { value: 'flexible', label: 'Flexible' }
] as const

export const YES_NO_OCCASIONALLY = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'occasionally', label: 'Occasionally' }
] as const

export const YES_NO_NEGOTIABLE = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'negotiable', label: 'Negotiable' }
] as const

export const COMMON_AMENITIES = [
  'WiFi',
  'Parking',
  'Laundry',
  'Kitchen Access',
  'Air Conditioning',
  'Heating',
  'Gym Access',
  'Pool',
  'Balcony',
  'Garden',
  'Dishwasher',
  'TV',
  'Workspace'
] as const

export const COMMON_HOBBIES = [
  'Reading',
  'Gaming',
  'Cooking',
  'Fitness',
  'Music',
  'Art',
  'Sports',
  'Travel',
  'Photography',
  'Dancing',
  'Writing',
  'Movies',
  'Hiking',
  'Yoga',
  'Programming'
] as const