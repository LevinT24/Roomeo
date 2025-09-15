"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user has a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session, redirect to auth page
        router.push('/?error=' + encodeURIComponent('Invalid or expired password reset link'))
      }
    }

    checkSession()
  }, [router])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      console.log("🔄 Updating password...")

      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      console.log("✅ Password updated successfully")
      setSuccess(true)

      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/?message=' + encodeURIComponent('Password updated successfully! You can now sign in with your new password.'))
      }, 2000)

    } catch (error: any) {
      console.error("❌ Password update error:", error)
      setError(error.message || "Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F2F5F1] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-green-100 border-4 border-green-500 p-6 text-center">
          <h2 className="text-2xl font-black text-green-700 mb-4">🎉 PASSWORD UPDATED!</h2>
          <p className="text-green-700 font-bold mb-4">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <p className="text-sm text-green-600">Redirecting you to the home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex flex-col">
      <header className="px-4 lg:px-6 h-16 md:h-20 flex items-center border-b-4 border-[#004D40] bg-[#004D40]">
        <button
          onClick={() => router.push('/')}
          className="flex items-center justify-center mr-2 md:mr-4 p-2"
        >
          <svg
            className="w-6 h-6 md:w-8 md:h-8 text-[#F2F5F1] hover:text-[#44C76F] transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-12 md:h-12 bg-[#44C76F] border-2 md:border-4 border-[#F2F5F1] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#F2F5F1] md:shadow-[4px_4px_0px_0px_#F2F5F1]">
            <span className="text-[#004D40] font-black text-sm md:text-xl transform -rotate-3">R</span>
          </div>
          <span className="font-black text-lg md:text-2xl tracking-tight transform -skew-x-6 text-[#F2F5F1]">ROOMIO</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,199,111,0.1)_25%,rgba(68,199,111,0.1)_50%,transparent_50%,transparent_75%,rgba(68,199,111,0.1)_75%)] bg-[length:20px_20px]"></div>

        <div className="max-w-lg w-full relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <div className="mb-4 md:mb-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#44C76F] border-2 md:border-4 border-[#004D40] transform rotate-3 flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-[3px_3px_0px_0px_#004D40] md:shadow-[6px_6px_0px_0px_#004D40]">
                <span className="text-[#004D40] font-black text-2xl md:text-3xl transform -rotate-3">🔑</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#004D40] mb-2 md:mb-3 transform -skew-x-2">
                UPDATE PASSWORD
              </h1>
              <div className="w-16 md:w-24 h-2 bg-[#44C76F] mx-auto transform skew-x-12 mb-3 md:mb-4"></div>
            </div>

            <p className="text-sm sm:text-base md:text-lg font-bold text-[#004D40] mb-4 md:mb-6 border-l-4 md:border-l-6 border-[#44C76F] pl-3 md:pl-4 text-left">
              SET A NEW PASSWORD FOR YOUR ACCOUNT. AFTER THIS, YOU CAN SIGN IN WITH EITHER YOUR EMAIL/PASSWORD OR GOOGLE ACCOUNT.
            </p>
          </div>

          {error && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-center text-sm md:text-base">
              {error}
            </div>
          )}

          <div className="bg-[#B7C8B5] border-2 md:border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] md:shadow-[8px_8px_0px_0px_#004D40] p-4 md:p-8">
            <form onSubmit={handlePasswordUpdate} className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-xs md:text-sm font-black text-[#004D40] mb-1 md:mb-2">NEW PASSWORD</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full border-2 md:border-4 border-[#004D40] font-bold focus:border-[#44C76F] focus:ring-[#44C76F] bg-[#F2F5F1] h-12 md:h-auto text-base"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-black text-[#004D40] mb-1 md:mb-2">CONFIRM NEW PASSWORD</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full border-2 md:border-4 border-[#004D40] font-bold focus:border-[#44C76F] focus:ring-[#44C76F] bg-[#F2F5F1] h-12 md:h-auto text-base"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] font-black text-base md:text-lg py-3 md:py-4 px-4 md:px-6 border-2 md:border-4 border-[#004D40] shadow-[3px_3px_0px_0px_#004D40] md:shadow-[6px_6px_0px_0px_#004D40] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] md:hover:shadow-[3px_3px_0px_0px_#004D40] transition-all disabled:opacity-50 h-12 md:h-auto"
              >
                {loading ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
              </Button>
            </form>

            <div className="mt-4 md:mt-6 text-center">
              <p className="text-xs md:text-sm font-bold text-[#004D40]">
                After updating your password, you can sign in with either email/password or Google account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}