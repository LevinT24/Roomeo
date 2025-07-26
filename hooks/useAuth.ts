"use client"

import { useState, useEffect } from "react"
import type { User } from "@/types/user"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for mock user in localStorage on component mount
    const checkMockUser = () => {
      try {
        const mockUser = localStorage.getItem("mockUser")
        if (mockUser) {
          const parsedUser = JSON.parse(mockUser)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error("Error parsing mock user:", error)
        localStorage.removeItem("mockUser")
      }
      setLoading(false)
    }

    checkMockUser()
  }, [])

  const signInWithGoogle = async () => {
    setLoading(true)

    try {
      // Create a basic mock user (incomplete profile for first-time flow)
      const mockUser: User = {
        id: "mock-user-123",
        email: "test@roomio.com",
        name: "Test User",
        profilePicture: "/placeholder.svg?height=100&width=100&text=Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Save to localStorage
      localStorage.setItem("mockUser", JSON.stringify(mockUser))

      // Update state
      setUser(mockUser)

      console.log("Basic mock user created:", mockUser)
    } catch (error) {
      console.error("Error creating mock user:", error)
    } finally {
      setLoading(false)
    }
  }

  const createCompleteUser = async () => {
    setLoading(true)

    try {
      // Create a COMPLETE mock user that bypasses all setup steps
      const mockUser: User = {
        id: "mock-user-complete-456",
        email: "complete@roomio.com",
        name: "Complete User",
        profilePicture: "/placeholder.svg?height=100&width=100&text=Complete",
        age: 25,
        bio: "I'm a complete test user. Love clean spaces and good vibes!",
        location: "San Francisco, CA",
        budget: 1500,
        preferences: {
          smoking: false,
          drinking: true,
          vegetarian: false,
          pets: true,
        },
        userType: "seeker",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Save to localStorage
      localStorage.setItem("mockUser", JSON.stringify(mockUser))

      // Update state
      setUser(mockUser)

      console.log("Complete mock user created:", mockUser)
    } catch (error) {
      console.error("Error creating complete mock user:", error)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      localStorage.removeItem("mockUser")
      setUser(null)
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  return {
    user,
    firebaseUser: null,
    loading,
    signInWithGoogle,
    createCompleteUser,
    logout,
  }
}
