// types/user.ts
export interface User {
  id: string;
  uid: string; // For Firebase compatibility
  email: string | null;
  name: string;
  age?: number;
  bio?: string;
  location?: string;
  budget?: number;
  preferences?: {
    smoking: boolean;
    drinking: boolean;
    vegetarian: boolean;
    pets: boolean;
  };
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