// types/user.ts
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  uid: string; // For Supabase compatibility
  email: string | null;
  name: string;
  age?: number;
  profession?: string;
  bio?: string;
  location?: string;
  budget?: number;
  preferences?: UserPreferences;
  hobbies?: string[];
  profilePicture?: string;
  userType?: 'seeker' | 'provider' | 'quick_access' | null;
  housingStatus?: 'looking' | 'offering' | 'flexible';
  profileVisible?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserPreferences {
  smoking: boolean;
  drinking: boolean;
  vegetarian: boolean;
  pets: boolean;
  quiet: boolean;
  social: boolean;
  organized: boolean;
  studious: boolean;
}

// User role types
export type UserRole = 'seeker' | 'provider' | 'quick_access'

// Profile form data types
export interface ProfileFormData {
  name: string;
  age: number;
  gender: string;
  profession: string;
  bio: string;
  hobbies: string[];
  smoking: "yes" | "no" | "occasionally";
  drinking: "yes" | "no" | "occasionally";
  pets: "yes" | "no" | "negotiable";
  budget_min?: number;
  budget_max?: number;
  location: string;
  profilePicture?: string;
}

export interface RoomDetailsFormData {
  room_type: 'private' | 'shared' | 'studio' | 'apartment';
  rent_amount: number;
  deposit_amount?: number;
  available_from?: string;
  lease_duration?: '6_months' | '1_year' | 'month_to_month' | 'flexible';
  furnished: boolean;
  utilities_included: boolean;
  amenities: string[];
  house_rules: string[];
  description?: string;
  address: string;
  neighborhood?: string;
}

export interface SeekerPreferencesFormData {
  preferred_gender?: string;
  age_range_min?: number;
  age_range_max?: number;
  preferred_location?: string;
  max_budget?: number;
  preferred_room_type?: 'private' | 'shared' | 'studio' | 'apartment';
  deal_breakers: string[];
}

export interface ProfileData {
  age: number;
  bio: string;
  location: string;
  budget: number;
  preferences: UserPreferences;
  profilePicture: string;
  updatedAt: Date;
}

export const createFallbackUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  uid: supabaseUser.id,
  email: supabaseUser.email ?? null,
  name: supabaseUser.user_metadata?.full_name || "",
  age: undefined,
  profession: "",
  bio: "",
  location: "",
  budget: undefined,
  hobbies: [],
  preferences: {
    smoking: false,
    drinking: false,
    vegetarian: false,
    pets: false,
    quiet: false,
    social: false,
    organized: false,
    studious: false,
  },
  profilePicture: "",
  userType: null,
  housingStatus: undefined,
  profileVisible: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});