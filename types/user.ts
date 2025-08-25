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
  ethnicity?: string;
  religion?: string;
  budget?: number;
  preferences?: UserPreferences;
  hobbies?: string[];
  profilePicture?: string;
  userType?: 'seeker' | 'provider' | null;
  housingStatus?: 'looking' | 'offering' | 'flexible';
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
  ethnicity: "",
  religion: "",
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
  createdAt: new Date(),
  updatedAt: new Date(),
});