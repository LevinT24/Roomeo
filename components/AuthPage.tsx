"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function AuthPage({ onBack, onSuccess }: AuthPageProps) {
  const { 
    loading, 
    error: authError,
    emailSignUp, 
    emailSignIn, 
    googleSignIn 
  } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    console.log("🔄 Starting email authentication...", { isSignUp, email, name });
    
    if (authError) {
      console.log("❌ Auth error detected:", authError);
      setError(authError);
      return;
    }
    
    if (!email || !password) {
      console.log("❌ Missing email or password");
      setError("Email and password are required");
      return;
    }

    try {
      if (isSignUp) {
        if (!name) {
          console.log("❌ Missing name for signup");
          setError("Name is required for sign up");
          return;
        }
        console.log("🔄 Calling emailSignUp...");
        await emailSignUp(email, password, name);
        console.log("✅ Email signup completed");
        // Let the page.tsx handle redirect based on auth state
      } else {
        console.log("🔄 Calling emailSignIn...");
        await emailSignIn(email, password);
        console.log("✅ Email signin completed");
        // Let the page.tsx handle redirect
      }
    } catch (error: any) {
      console.error("❌ Authentication error:", error);
      setError(error.message || "Authentication failed. Please try again.");
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    
    console.log("🔄 Starting Google authentication...");
    
    if (authError) {
      console.log("❌ Auth error detected:", authError);
      setError(authError);
      return;
    }
    
    try {
      console.log("🔄 Calling googleSignIn...");
      await googleSignIn();
      console.log("✅ Google signin completed");
      onSuccess();
    } catch (error: any) {
      console.error("❌ Google authentication error:", error);
      setError(error.message || "Google authentication failed");
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-100 border-4 border-red-500 p-6 text-center">
          <h2 className="text-2xl font-black text-red-700 mb-4">Configuration Error</h2>
          <p className="text-red-700 font-bold mb-4">{authError}</p>
          <div className="text-sm text-red-600 text-left">
            <p className="font-bold mb-2">Check these environment variables in .env.local:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
          <button 
            onClick={onBack}
            className="mt-4 bg-red-600 text-white px-4 py-2 font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex flex-col">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b-4 border-[#004D40] bg-[#004D40]">
        <button onClick={onBack} className="flex items-center justify-center mr-4">
          <svg
            className="w-8 h-8 text-[#F2F5F1] hover:text-[#44C76F] transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#44C76F] border-4 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[4px_4px_0px_0px_#F2F5F1]">
            <span className="text-[#004D40] font-black text-xl transform -rotate-3">R</span>
          </div>
          <span className="font-black text-2xl tracking-tight transform -skew-x-6 text-[#F2F5F1]">ROOMIO</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,199,111,0.1)_25%,rgba(68,199,111,0.1)_50%,transparent_50%,transparent_75%,rgba(68,199,111,0.1)_75%)] bg-[length:20px_20px]"></div>

        <div className="max-w-4xl w-full relative z-10">
          <div className="text-center mb-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-[#44C76F] border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-4 shadow-[6px_6px_0px_0px_#004D40]">
                <span className="text-[#004D40] font-black text-3xl transform -rotate-3">R</span>
              </div>
              <h1 className="text-4xl font-black text-[#004D40] mb-3 transform -skew-x-2">
                {isSignUp ? "JOIN ROOMIO" : "WELCOME BACK"}
              </h1>
              <div className="w-24 h-2 bg-[#44C76F] mx-auto transform skew-x-12 mb-4"></div>
            </div>

            <h2 className="text-2xl font-black text-[#004D40] mb-3 transform -skew-x-1">
              {isSignUp ? "CREATE YOUR ACCOUNT" : "SIGN IN TO YOUR ACCOUNT"}
            </h2>
            <p className="text-lg font-bold text-[#004D40] mb-6 border-l-6 border-[#44C76F] pl-4 text-left max-w-2xl mx-auto">
              {isSignUp
                ? "JOIN THOUSANDS OF PEOPLE FINDING THEIR PERFECT ROOMMATES ON ROOMIO."
                : "WELCOME BACK! CONTINUE YOUR ROOMMATE SEARCH WHERE YOU LEFT OFF."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-center">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-6 p-4 bg-blue-100 border-2 border-blue-500 text-blue-700 font-bold text-center">
              Processing... Please wait
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-8">
              <h3 className="text-2xl font-black text-[#004D40] mb-6 transform -skew-x-1 text-center">
                {isSignUp ? "SIGN UP WITH EMAIL" : "SIGN IN WITH EMAIL"}
              </h3>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-sm font-black text-[#004D40] mb-2">FULL NAME</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] focus:ring-[#44C76F] bg-[#F2F5F1]"
                      required={isSignUp}
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-2">EMAIL ADDRESS</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] focus:ring-[#44C76F] bg-[#F2F5F1]"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-[#004D40] mb-2">PASSWORD</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full border-4 border-[#004D40] font-bold focus:border-[#44C76F] focus:ring-[#44C76F] bg-[#F2F5F1]"
                    required
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !!authError}
                  className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black text-lg py-4 px-6 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all disabled:opacity-50"
                >
                  {loading ? "PROCESSING..." : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm font-black text-[#44C76F] hover:text-[#44C76F]/80 transition-colors"
                  disabled={loading}
                >
                  {isSignUp ? "Already have an account? SIGN IN" : "Don't have an account? SIGN UP"}
                </button>
              </div>
            </div>

            <div className="bg-[#B7C8B5] border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] p-8">
              <h3 className="text-2xl font-black text-[#004D40] mb-6 transform -skew-x-1 text-center">
                {isSignUp ? "SIGN UP WITH GOOGLE" : "SIGN IN WITH GOOGLE"}
              </h3>

              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[#44C76F]" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <p className="text-lg font-bold text-[#004D40] mb-6">
                    {isSignUp
                      ? "Quick and secure sign up with your Google account"
                      : "Sign in instantly with your Google account"}
                  </p>
                </div>

                <Button
                  onClick={handleGoogleAuth}
                  disabled={loading || !!authError}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-[#F2F5F1] font-black text-lg py-4 px-6 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {loading ? "PROCESSING..." : `CONTINUE WITH GOOGLE`}
                </Button>

                <div className="text-center">
                  <p className="text-sm font-bold text-[#004D40]">
                    {isSignUp ? "New users go through profile setup" : "Existing users skip to matching"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}