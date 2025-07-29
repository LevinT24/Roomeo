# Quick Start - Supabase Authentication

## 🚀 Get Started in 5 Minutes

The authentication system is now working with client-side Supabase authentication. Here's how to set it up:

### 1. Create Supabase Project

1. Go to [Supabase Console](https://supabase.com/dashboard)
2. Click "New Project"
3. Follow the setup wizard

### 2. Enable Authentication

1. In Supabase Console, go to **Authentication** > **Settings**
2. Enable **Email/Password**
3. Enable **Google** (add `localhost` to authorized domains)

### 3. Create Database Table

1. Go to **SQL Editor**
2. Run this SQL to create the users table:

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

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 4. Set up Storage

1. Go to **Storage**
2. Create a new bucket called "avatars"
3. Set it to public
4. Run this SQL for storage policies:

```sql
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

### 5. Get Your Config

1. Go to **Settings** > **API**
2. Copy the Project URL and anon/public key

### 6. Set Environment Variables

Create a `.env.local` file in the Roomeo directory:

```env
# Supabase Configuration (Client-side)
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 7. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## ✅ What's Working Now

- **Email/Password Sign Up** - Creates user in Supabase Auth and database
- **Email/Password Sign In** - Authenticates with Supabase Auth
- **Google Sign In** - Uses Google OAuth with Supabase
- **User Profile Storage** - Saves user data to Supabase database
- **Error Handling** - Proper error messages for all scenarios
- **Loading States** - UI feedback during authentication

## 🔧 Features

- ✅ Real-time authentication state
- ✅ User profile management
- ✅ Google OAuth integration
- ✅ Email/password authentication
- ✅ Supabase database integration
- ✅ Row Level Security
- ✅ Error handling and validation
- ✅ Loading states and user feedback

## 📝 Example Supabase Config

Your Supabase config should look like this:

```javascript
const supabaseUrl = "https://your-project.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🎯 Next Steps

1. Set up your Supabase project
2. Add the environment variables
3. Run the app
4. Test sign up and sign in
5. Check the Supabase database to see user data

The authentication system is now fully functional with client-side Supabase authentication! 