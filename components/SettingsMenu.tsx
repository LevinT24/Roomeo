"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { User, Settings, LogOut, Trash2, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { updateUserProfile } from "@/services/supabase"

interface SettingsMenuProps {
  user: any
}

export default function SettingsMenu({ user }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showUpdateAccount, setShowUpdateAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [updateData, setUpdateData] = useState({
    name: user?.name || "",
    age: user?.age || "",
    bio: user?.bio || "",
    location: user?.location || "",
    budget: user?.budget || ""
  })
  
  const { logout } = useAuth()

  const handleUpdateAccount = async () => {
    if (!user?.id) {
      console.error("No user ID available for update")
      alert("Error: No user information available. Please sign in again.")
      return
    }
    
    setIsUpdating(true)
    try {
      console.log("🔄 Starting account update for user:", user.id)
      console.log("🔄 Update data:", updateData)
      
      // Validate required fields
      if (!updateData.name?.trim()) {
        alert("Name is required")
        setIsUpdating(false)
        return
      }
      
      // Parse numbers safely
      const ageValue = updateData.age ? parseInt(updateData.age.toString()) : null
      const budgetValue = updateData.budget ? parseInt(updateData.budget.toString()) : null
      
      // Check if parsed numbers are valid
      if (updateData.age && (ageValue === null || isNaN(ageValue))) {
        alert("Please enter a valid age")
        setIsUpdating(false)
        return
      }
      
      if (updateData.budget && (budgetValue === null || isNaN(budgetValue))) {
        alert("Please enter a valid budget")
        setIsUpdating(false)
        return
      }
      
      const updatePayload = {
        name: updateData.name.trim(),
        age: ageValue,
        bio: updateData.bio?.trim() || "",
        location: updateData.location?.trim() || "",
        budget: budgetValue
      }
      
      console.log("🔄 Final update payload:", updatePayload)
      
      const success = await updateUserProfile(user.id, updatePayload)
      
      if (success) {
        console.log("✅ Account update successful")
        alert("Account updated successfully!")
        setShowUpdateAccount(false)
        setIsOpen(false)
        // Refresh the page to reflect changes
        window.location.reload()
      } else {
        console.error("❌ Account update failed - updateUserProfile returned false")
        alert("Failed to update account. Please check the console for details and try again.")
      }
    } catch (error) {
      console.error("❌ Exception during account update:", error)
      alert(`Failed to update account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) return
    
    setIsDeleting(true)
    try {
      // Delete user from users table first
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
      
      if (userError) {
        console.error("Error deleting user profile:", userError)
        alert("Failed to delete account. Please try again.")
        return
      }
      
      // Sign out the user (this will handle auth cleanup)
      await logout()
      alert("Account deleted successfully.")
      
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("Failed to delete account. Please try again.")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSignOut = async () => {
    try {
      console.log("🔄 Starting sign out process...")
      setIsOpen(false) // Close the dropdown immediately
      
      await logout()
      console.log("✅ Sign out successful")
      
      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.href = "/"
      }, 100)
      
    } catch (error) {
      console.error("❌ Error signing out:", error)
      alert(`Failed to sign out: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (showUpdateAccount) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-[#004D40]">UPDATE ACCOUNT</h2>
              <Button
                onClick={() => setShowUpdateAccount(false)}
                variant="outline"
                size="sm"
                className="border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">NAME</label>
                <Input
                  value={updateData.name}
                  onChange={(e) => setUpdateData({ ...updateData, name: e.target.value })}
                  className="border-2 border-[#004D40] font-bold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">AGE</label>
                <Input
                  type="number"
                  value={updateData.age}
                  onChange={(e) => setUpdateData({ ...updateData, age: e.target.value })}
                  className="border-2 border-[#004D40] font-bold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">BIO</label>
                <Input
                  value={updateData.bio}
                  onChange={(e) => setUpdateData({ ...updateData, bio: e.target.value })}
                  className="border-2 border-[#004D40] font-bold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">LOCATION</label>
                <Input
                  value={updateData.location}
                  onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })}
                  className="border-2 border-[#004D40] font-bold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-black text-[#004D40] mb-2">BUDGET ($)</label>
                <Input
                  type="number"
                  value={updateData.budget}
                  onChange={(e) => setUpdateData({ ...updateData, budget: e.target.value })}
                  className="border-2 border-[#004D40] font-bold"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleUpdateAccount}
                disabled={isUpdating}
                className="flex-1 bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
              >
                {isUpdating ? "UPDATING..." : "UPDATE"}
              </Button>
              <Button
                onClick={() => setShowUpdateAccount(false)}
                variant="outline"
                className="flex-1 border-2 border-[#004D40] text-[#004D40] hover:bg-[#004D40] hover:text-[#F2F5F1] font-black"
              >
                CANCEL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md border-4 border-red-500 shadow-[8px_8px_0px_0px_red] bg-red-100">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-500 border-4 border-red-700 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-red-700 mb-4">DELETE ACCOUNT</h2>
            <p className="text-red-700 font-bold mb-6">
              Are you sure you want to permanently delete your account? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black border-2 border-red-700 shadow-[4px_4px_0px_0px_red] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_red] transition-all"
              >
                {isDeleting ? "DELETING..." : "DELETE FOREVER"}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1 border-2 border-red-700 text-red-700 hover:bg-red-700 hover:text-white font-black"
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
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#004D40] hover:bg-[#004D40]/80 text-[#F2F5F1] border-2 border-[#F2F5F1] shadow-[4px_4px_0px_0px_#F2F5F1] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#F2F5F1] transition-all p-3"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-64 border-4 border-[#004D40] shadow-[8px_8px_0px_0px_#004D40] bg-[#F2F5F1] z-50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="border-b-2 border-[#004D40] pb-3">
                  <p className="font-black text-[#004D40] text-sm">
                    {user?.name || user?.email}
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    setShowUpdateAccount(true)
                    setIsOpen(false)
                  }}
                  className="w-full justify-start bg-transparent hover:bg-[#44C76F]/20 text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                >
                  <User className="h-4 w-4 mr-2" />
                  UPDATE ACCOUNT
                </Button>
                
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(true)
                    setIsOpen(false)
                  }}
                  className="w-full justify-start bg-transparent hover:bg-red-100 text-red-600 font-black border-2 border-red-600 shadow-[2px_2px_0px_0px_red] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_red] transition-all"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  DELETE ACCOUNT
                </Button>
                
                <Button
                  onClick={handleSignOut}
                  className="w-full justify-start bg-transparent hover:bg-[#004D40]/10 text-[#004D40] font-black border-2 border-[#004D40] shadow-[2px_2px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  SIGN OUT
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}