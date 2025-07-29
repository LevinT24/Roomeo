# Supabase Authentication Setup

## Environment Variables

Create a `.env.local` file in the Roomeo directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Project Setup

1. Go to [Supabase Console](https://supabase.com/dashboard)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to Authentication > Settings
   - Enable Email/Password
   - Enable Google OAuth (add your domain to authorized domains)
4. Create Database Tables:
   - Go to SQL Editor
   - Create the users table with the following schema:

```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  uid UUID REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  profilePicture TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  isVerified BOOLEAN DEFAULT FALSE,
  age INTEGER,
  bio TEXT,
  location TEXT,
  budget INTEGER,
  preferences JSONB,
  userType TEXT,
  lifestyle JSONB
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own data
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

5. Set up Storage:
   - Go to Storage
   - Create a new bucket called "avatars"
   - Set the bucket to public
   - Create storage policies:

```sql
-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

-- Allow public access to view avatars
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

6. Get your config:
   - Go to Settings > API
   - Copy the Project URL and anon/public key

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features Implemented

- ✅ Email/Password Sign Up
- ✅ Email/Password Sign In
- ✅ Google Authentication
- ✅ User data storage in Supabase
- ✅ Row Level Security for data protection
- ✅ Error handling and validation
- ✅ User profile management

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/google` - Google authentication

## Database Schema

Users are stored in Supabase with the following structure:

```typescript
{
  id: string,
  uid: string,
  email: string,
  name: string,
  profilePicture: string,
  createdAt: Date,
  updatedAt: Date,
  isVerified: boolean,
  age?: number,
  bio?: string,
  location?: string,
  budget?: number,
  preferences?: {
    smoking: boolean,
    drinking: boolean,
    vegetarian: boolean,
    pets: boolean
  },
  userType?: "seeker" | "provider",
  lifestyle?: object
}
``` 