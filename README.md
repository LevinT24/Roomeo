# Roomio - Roommate Finder App

A modern roommate finding application built with Next.js, TypeScript, and Supabase.

## 🚀 Features

- **Authentication**: Email/password and Google OAuth with Supabase Auth
- **User Profiles**: Complete profile management with preferences
- **Real-time Chat**: Built-in messaging system
- **Roommate Matching**: Advanced matching algorithm
- **Expense Tracking**: Shared expense management
- **Marketplace**: Room and furniture listings
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (Database, Auth, Storage)
- **Styling**: Tailwind CSS, Radix UI
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd roomeo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [Supabase Console](https://supabase.com/dashboard)
2. Enable Authentication (Email/Password and Google)
3. Create the database schema (see `SUPABASE_SETUP.md`)
4. Set up storage bucket for avatars
5. Get your project URL and anon key

### 4. Environment Variables

Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Complete Supabase configuration
- [Quick Start Guide](./QUICK_START_SUPABASE.md) - Get started in 5 minutes

## 🏗️ Project Structure

```
Roomeo/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Auth callback routes
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # UI components
│   └── *.tsx             # Page components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── services/             # Service layer
├── types/                # TypeScript types
└── public/               # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Schema

The app uses the following main tables:

- `users` - User profiles and preferences
- `chats` - Chat conversations
- `messages` - Individual messages
- `matches` - Roommate matches
- `expenses` - Shared expenses
- `listings` - Marketplace listings

## 🔐 Authentication

The app uses Supabase Auth with:

- Email/password authentication
- Google OAuth
- Row Level Security (RLS) policies
- JWT tokens for API access

## 🎨 UI Components

Built with:

- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Custom Design System** - Consistent styling

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the [Supabase Setup Guide](./SUPABASE_SETUP.md)
2. Verify your environment variables
3. Check the browser console for errors
4. Open an issue on GitHub

## 🔄 Migration from Firebase

This project was migrated from Firebase to Supabase. Key changes:

- **Authentication**: Firebase Auth → Supabase Auth
- **Database**: Firestore → Supabase PostgreSQL
- **Storage**: Firebase Storage → Supabase Storage
- **API**: Server-side auth → Client-side auth with RLS

See the commit history for detailed migration steps.
