"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Home, Search, Crown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/types/roommate"

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void
  loading?: boolean
}

export default function RoleSelection({ onRoleSelect, loading = false }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setTimeout(() => onRoleSelect(role), 300) // Small delay for animation
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-amber-600">Roomeo</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find your perfect roommate match! First, let us know what you're looking for.
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Seeker Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 cursor-pointer group ${
              selectedRole === 'seeker' 
                ? 'border-blue-500 shadow-2xl shadow-blue-500/25' 
                : 'border-gray-200 hover:border-blue-300 hover:shadow-2xl'
            }`}
            onClick={() => handleRoleSelect('seeker')}
          >
            <div className="p-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                <Search className="w-8 h-8 text-blue-600" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                I'm a Seeker
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Looking for a room or roommate? Browse available spaces and connect with compatible roommates.
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Browse available rooms
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Set your preferences
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Match with providers
                </li>
              </ul>

              {/* Button */}
              <Button 
                className="w-full bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all"
                disabled={loading}
              >
                {selectedRole === 'seeker' && loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Setting up...
                  </div>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Choose Seeker
                  </>
                )}
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-50 rounded-full -ml-12 -mb-12 opacity-30"></div>
          </motion.div>

          {/* Provider Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl shadow-xl border-2 transition-all duration-300 cursor-pointer group ${
              selectedRole === 'provider' 
                ? 'border-amber-300 shadow-2xl shadow-amber-500/25' 
                : 'border-amber-500 hover:border-amber-300 hover:shadow-2xl'
            }`}
            onClick={() => handleRoleSelect('provider')}
          >
            <div className="p-8">
              {/* Icon */}
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors">
                <Home className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-white mb-4">
                I'm a Provider
              </h3>
              <p className="text-white/90 mb-6 leading-relaxed">
                Have a room to offer? Showcase your space and find the perfect roommate match.
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                <li className="flex items-center text-sm text-white/90">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  List your room with photos
                </li>
                <li className="flex items-center text-sm text-white/90">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Set your requirements
                </li>
                <li className="flex items-center text-sm text-white/90">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Match with seekers
                </li>
              </ul>

              {/* Button */}
              <Button 
                className="w-full bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/30 hover:border-white/50 transition-all"
                disabled={loading}
              >
                {selectedRole === 'provider' && loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </div>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Choose Provider
                  </>
                )}
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            
            {/* Crown decoration */}
            <div className="absolute top-4 right-4">
              <Crown className="w-6 h-6 text-white/30" />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-gray-500">
            You can always change your role later in your profile settings
          </p>
        </motion.div>
      </div>
    </div>
  )
}