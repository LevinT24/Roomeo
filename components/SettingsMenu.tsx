"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { User, Settings, LogOut, Trash2, X, Camera, Upload, Eye } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { updateUserProfile } from "@/services/supabase"
import EnhancedProfileEdit from "@/components/EnhancedProfileEdit"

interface SettingsMenuProps {
  user: any
}

export default function SettingsMenu({ user }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showProfileView, setShowProfileView] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const [profileData, setProfileData] = useState({
    role: user?.role || "seeker",
    profilePhoto: null as File | null,
    roomImages: [] as File[]
  })
  
  const { logout } = useAuth()

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileData({ ...profileData, profilePhoto: file })
    }
  }

  const handleRoomImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setProfileData({ ...profileData, roomImages: [...profileData.roomImages, ...files] })
  }

  const removeRoomImage = (index: number) => {
    const newImages = profileData.roomImages.filter((_, i) => i !== index)
    setProfileData({ ...profileData, roomImages: newImages })
  }

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true)
      
      // Here you would typically upload the files to your storage service
      // and update the user profile with the new role and image URLs
      
      console.log("Saving profile:", {
        role: profileData.role,
        profilePhoto: profileData.profilePhoto?.name,
        roomImages: profileData.roomImages.map(img => img.name)
      })
      
      // For now, just update the role in the user profile
      const success = await updateUserProfile(user.id, { 
        role: profileData.role 
      })
      
      if (success) {
        alert("Profile updated successfully!")
        setShowProfileEdit(false)
        setIsOpen(false)
        window.location.reload()
      } else {
        alert("Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
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
              Are you sure you want to permanently delete your account? This action cannot be undone.
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

  if (showProfileView) {
    return (
      <EnhancedProfileEdit
        user={user}
        onClose={() => setShowProfileView(false)}
        onUpdate={() => {
          setShowProfileView(false)
          setIsOpen(false)
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] border-2 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all p-3 font-black"
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
                    setShowProfileView(true)
                    setIsOpen(false)
                  }}
                  className="w-full justify-start bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40] font-black border-2 border-[#004D40] shadow-[3px_3px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  VIEW & EDIT PROFILE
                </Button>
                
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(true)
                    setIsOpen(false)
                  }}
                  className="w-full justify-start bg-red-100 hover:bg-red-200 text-red-600 font-black border-2 border-red-500 shadow-[3px_3px_0px_0px_red] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_red] transition-all"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  DELETE ACCOUNT
                </Button>
                
                <Button
                  onClick={handleSignOut}
                  className="w-full justify-start bg-white hover:bg-gray-50 text-[#004D40] font-black border-2 border-[#004D40] shadow-[3px_3px_0px_0px_#004D40] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_#004D40] transition-all"
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