// types/user.ts
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  uid: string; // For Supabase compatibility
  email: string | null;
  name: string;
  age?: number;
  bio?: string;
  location?: string;
  budget?: number;
  preferences?: UserPreferences;
  profilePicture?: string;
  userType?: 'seeker' | 'provider' | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserPreferences {
  smoking: boolean;
  drinking: boolean;
  vegetarian: boolean;
  pets: boolean;
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
  bio: "",
  location: "",
  budget: undefined,
  preferences: {
    smoking: false,
    drinking: false,
    vegetarian: false,
    pets: false,
  },
  profilePicture: "",
  userType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});