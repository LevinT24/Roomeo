// If your components are expecting a different User interface, 
// create this file to match what they expect:

// components/types.ts (or wherever your components expect it)
export interface User {
  id: string;
  name: string;
  email: string | null;
  uid?: string;
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
  userType?: string;
}