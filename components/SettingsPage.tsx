"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Trash2, Settings, User, Shield, HelpCircle, Bell, Lock, Unlock, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"

interface SettingsPageProps {
  user: any
  onBack: () => void
  onUpgrade?: () => void
}

export default function SettingsPage({ user, onBack, onUpgrade }: SettingsPageProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [profileVisible, setProfileVisible] = useState(user?.profileVisible ?? true)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  
  const { logout } = useAuth()

  // Update local state when user prop changes
  useEffect(() => {
    setProfileVisible(user?.profileVisible ?? true)
  }, [user?.profileVisible])

  const handleToggleProfileVisibility = async () => {
    if (!user?.id) {
      alert("User ID not found. Please refresh and try again.")
      return
    }

    setIsUpdatingVisibility(true)
    const newVisibility = !profileVisible

    try {
      console.log("🔄 Updating profile visibility:", { 
        userId: user.id, 
        currentVisibility: profileVisible, 
        newVisibility 
      })

      const { error } = await supabase
        .from('users')
        .update({ profilevisible: newVisibility })
        .eq('id', user.id)

      if (error) {
        console.error("❌ Failed to update profile visibility:", error)
        alert(`Failed to update profile visibility: ${error.message}`)
        return
      }

      setProfileVisible(newVisibility)
      console.log("✅ Profile visibility updated successfully")
      
      // Show confirmation message
      const message = newVisibility 
        ? "Profile activated! You can now browse and be discovered by others." 
        : "Profile locked! You're now hidden from discovery and cannot browse others until you unhide."
      alert(message)

    } catch (error) {
      console.error("❌ Exception updating profile visibility:", error)
      alert(`Unexpected error: ${error.message || error}`)
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      alert("No user ID found. Please refresh and try again.")
      return
    }
    
    setIsDeleting(true)
    try {
      console.log("🔍 DEBUGGING ACCOUNT DELETION:")
      console.log("   - User object:", user)
      console.log("   - User ID:", user.id)
      console.log("   - User ID type:", typeof user.id)
      
      // Step 1: Get current auth user to verify identity
      const { data: { user: authUser }, error: authCheckError } = await supabase.auth.getUser()
      console.log("   - Current auth user:", authUser?.id)
      console.log("   - Auth check error:", authCheckError)
      
      if (authCheckError) {
        alert("Authentication error. Please sign in again and try.")
        return
      }
      
      if (!authUser || authUser.id !== user.id) {
        alert("User identity mismatch. Please sign out and sign in again.")
        return
      }
      
      // Step 2: Verify user exists in users table before deletion
      console.log("🔍 Checking if user exists in database...")
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', user.id)
        .single()
      
      console.log("   - User exists check:", existingUser)
      console.log("   - Check error:", checkError)
      
      if (checkError) {
        if (checkError.code === 'PGRST116') {
          alert("User record not found in database. You may already be deleted.")
          await logout()
          return
        } else {
          alert(`Database check failed: ${checkError.message}`)
          return
        }
      }
      
      // Step 3: Attempt deletion with detailed result tracking
      console.log("🗑️ Attempting to delete user from users table...")
      const { data: deleteData, error: userError, status, statusText } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
        .select() // This will return the deleted rows
      
      console.log("   - Delete response status:", status)
      console.log("   - Delete response statusText:", statusText)
      console.log("   - Delete data (deleted rows):", deleteData)
      console.log("   - Delete error:", userError)
      
      if (userError) {
        console.error("❌ DELETE failed with error:", userError)
        alert(`Failed to delete account: ${userError.message}. Please contact support.`)
        return
      }
      
      // Step 4: Check if any rows were actually deleted
      if (!deleteData || deleteData.length === 0) {
        console.error("❌ DELETE succeeded but no rows were affected!")
        alert("Account deletion failed: No rows were deleted. This might be due to database permissions. Please contact support.")
        return
      }
      
      console.log(`✅ Successfully deleted ${deleteData.length} row(s) from users table`)
      console.log("   - Deleted user data:", deleteData[0])
      
      // Step 5: Verify deletion by checking if user still exists
      console.log("🔍 Verifying deletion...")
      const { data: verifyData, error: verifyError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (verifyData) {
        console.error("❌ VERIFICATION FAILED: User still exists after deletion!")
        console.log("   - User still in DB:", verifyData)
        alert("Account deletion verification failed. The user record still exists. Please contact support.")
        return
      }
      
      if (verifyError && verifyError.code === 'PGRST116') {
        console.log("✅ VERIFICATION PASSED: User no longer exists in database")
      } else {
        console.warn("⚠️ Verification check had unexpected result:", verifyError)
      }
      
      // Step 6: Sign out the user
      console.log("🔄 Signing out user...")
      await logout()
      
      console.log("🎉 Account deletion completed and verified!")
      alert("Account successfully deleted and verified. You have been signed out.")
      
    } catch (error) {
      console.error("❌ Exception during account deletion:", error)
      alert(`Unexpected error during account deletion: ${error.message || error}`)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Delete Confirmation Modal
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md border-4 border-red-500 shadow-[8px_8px_0px_0px_red] bg-[#F2F5F1]">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-500 border-4 border-[#004D40] flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_#004D40]">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-[#004D40] mb-4">DELETE ACCOUNT</h2>
            <p className="text-[#004D40] font-bold mb-6">
              Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, matches, and conversations.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                {isDeleting ? "DELETING..." : "DELETE FOREVER"}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1 border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
              >
                CANCEL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F5F1] pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#F2F5F1] border-b-4 border-[#004D40] px-4 py-3 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={onBack}
              className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all p-3 font-black"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-black text-[#004D40]">SETTINGS</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#44C76F] border-2 border-[#004D40] transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#004D40]">
              <span className="text-[#004D40] font-black text-xs transform -rotate-3">R</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 px-4 space-y-6">
        {/* User Info Card */}
        <Card className="border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1]">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#44C76F] border-4 border-[#004D40] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#004D40]">
                <User className="h-8 w-8 text-[#004D40]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#004D40]">{user?.name || "User"}</h2>
                <p className="text-[#44C76F] font-bold">{user?.email}</p>
                <p className="text-[#004D40] font-bold text-sm">
                  {user?.role === "seeker" ? "Looking for Owners" : "Looking for Roommates"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Section for Quick Access Users */}
        {user?.userType === 'quick_access' && (
          <Card className="border-4 border-[#44C76F] shadow-[8px_8px_0px_0px_#44C76F] bg-[#44C76F]/10">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-[#44C76F] border-4 border-[#004D40] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[6px_6px_0px_0px_#004D40] animate-pulse">
                <Unlock className="h-8 w-8 text-[#004D40]" />
              </div>
              
              <h3 className="text-xl font-black text-[#004D40] mb-3">
                🚀 UPGRADE TO FULL FEATURES
              </h3>
              
              <p className="text-[#004D40] font-bold mb-4 leading-tight">
                Unlock roommate matching, swiping, and access to the matches page!
              </p>

              <div className="bg-[#F2F5F1] border-2 border-[#004D40] p-3 mb-4 text-left rounded">
                <p className="font-black text-[#004D40] text-sm mb-2">✨ YOU'LL GET ACCESS TO:</p>
                <ul className="space-y-1 text-xs font-bold text-[#004D40]">
                  <li>• Swipe through potential roommates</li>
                  <li>• Match with compatible people</li>
                  <li>• View detailed profiles & photos</li>
                  <li>• Access the matches page</li>
                </ul>
              </div>
              
              <Button
                onClick={() => {
                  if (onUpgrade) {
                    onUpgrade()
                  } else {
                    alert("Upgrade functionality not available")
                  }
                }}
                className="w-full bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black text-lg py-4 px-6 border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_#004D40] transition-all"
              >
                🔓 UNLOCK FULL FEATURES
              </Button>
              
              <p className="text-xs font-bold text-[#004D40] opacity-70 mt-3">
                Keep all your marketplace listings, expenses, and chat history!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Settings Options */}
        <div className="space-y-4">
          {/* Account Section */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#F2F5F1]">
            <CardContent className="p-4">
              <h3 className="text-lg font-black text-[#004D40] mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                ACCOUNT
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    // Could add change password functionality here
                    alert("Change password functionality coming soon!")
                  }}
                  className="w-full justify-start bg-white hover:bg-gray-50 text-[#004D40] font-black border-2 border-[#004D40] shadow-[3px_3px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                >
                  <Shield className="h-4 w-4 mr-3" />
                  CHANGE PASSWORD
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security Section */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#F2F5F1]">
            <CardContent className="p-4">
              <h3 className="text-lg font-black text-[#004D40] mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                PRIVACY & SECURITY
              </h3>
              <div className="space-y-3">
                {/* Profile Visibility Toggle */}
                <div className="bg-white border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 border-2 border-[#004D40] rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_#004D40] transition-all ${
                        profileVisible 
                          ? 'bg-[#44C76F] text-[#004D40]' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {profileVisible ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <EyeOff className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-[#004D40] text-sm">
                          {profileVisible ? 'PROFILE VISIBLE' : 'PROFILE HIDDEN'}
                        </h4>
                        <p className="text-xs font-bold text-[#004D40]/70">
                          {profileVisible 
                            ? 'You can browse and be discovered by others' 
                            : 'Discovery blocked both ways'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Modern Toggle Switch */}
                    <button
                      onClick={handleToggleProfileVisibility}
                      disabled={isUpdatingVisibility}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] ${
                        profileVisible 
                          ? 'bg-[#44C76F]' 
                          : 'bg-red-200'
                      } ${isUpdatingVisibility ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      <span className="sr-only">Toggle profile visibility</span>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-[#004D40] shadow-[1px_1px_0px_0px_#004D40] transition-all ${
                        profileVisible ? 'translate-x-6' : 'translate-x-1'
                      }`}>
                        {isUpdatingVisibility ? (
                          <div className="w-3 h-3 border border-[#004D40] border-t-transparent rounded-full animate-spin" />
                        ) : profileVisible ? (
                          <Lock className="h-3 w-3 text-[#44C76F]" />
                        ) : (
                          <Unlock className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    </button>
                  </div>
                  
                  {/* Status Description */}
                  <div className={`mt-3 p-2 rounded border-2 ${
                    profileVisible 
                      ? 'border-[#44C76F] bg-[#44C76F]/10' 
                      : 'border-red-300 bg-red-50'
                  }`}>
                    <p className={`text-xs font-bold ${
                      profileVisible ? 'text-[#004D40]' : 'text-red-700'
                    }`}>
                      {profileVisible ? (
                        <>
                          <span className="font-black">ACTIVE:</span> Your profile appears in discovery and you can browse others. Full access to matching features.
                        </>
                      ) : (
                        <>
                          <span className="font-black">LOCKED:</span> Your profile is hidden from discovery AND you cannot browse other profiles. Complete privacy mode.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    // Could add privacy settings functionality here
                    alert("Notification settings functionality coming soon!")
                  }}
                  className="w-full justify-start bg-white hover:bg-gray-50 text-[#004D40] font-black border-2 border-[#004D40] shadow-[3px_3px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                >
                  <Bell className="h-4 w-4 mr-3" />
                  NOTIFICATION SETTINGS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help & Support Section */}
          <Card className="border-4 border-[#004D40] shadow-[6px_6px_0px_0px_#004D40] bg-[#F2F5F1]">
            <CardContent className="p-4">
              <h3 className="text-lg font-black text-[#004D40] mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                HELP & SUPPORT
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    // Could add help/FAQ functionality here
                    alert("Help & FAQ functionality coming soon!")
                  }}
                  className="w-full justify-start bg-white hover:bg-gray-50 text-[#004D40] font-black border-2 border-[#004D40] shadow-[3px_3px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                >
                  <HelpCircle className="h-4 w-4 mr-3" />
                  HELP & FAQ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-4 border-red-500 shadow-[6px_6px_0px_0px_red] bg-[#F2F5F1]">
            <CardContent className="p-4">
              <h3 className="text-lg font-black text-red-600 mb-4 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                DANGER ZONE
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full justify-start bg-red-100 hover:bg-red-200 text-red-600 font-black border-2 border-red-500 shadow-[3px_3px_0px_0px_red] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_red] transition-all"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  DELETE ACCOUNT
                </Button>
                <p className="text-sm text-red-600 font-bold pl-7">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}