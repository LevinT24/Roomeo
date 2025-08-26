"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Home, Search, Crown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/types/user"

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void
  loading?: boolean
}

export default function RoleSelection({ onRoleSelect, loading = false }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const roles = [
    {
      id: 'provider' as UserRole,
      title: 'Room Provider',
      subtitle: 'I have a place, need roommates',
      icon: Home,
      description: 'Perfect for landlords, leaseholders, or anyone with extra space',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'seeker' as UserRole,
      title: 'Room Seeker', 
      subtitle: 'I need a place to stay',
      icon: Search,
      description: 'Great for students, professionals, or anyone looking for housing',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    }
  ]

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to Roomio
          </h1>
          <p className="text-xl text-gray-600">
            Let&apos;s get started by understanding your housing situation
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedRole === role.id 
                  ? 'scale-105 shadow-xl ring-4 ring-blue-200' 
                  : 'hover:scale-102 hover:shadow-lg'
              }`}
              onClick={() => handleRoleSelect(role.id)}
            >
              <div className={`bg-white rounded-2xl p-8 border-2 transition-colors ${
                selectedRole === role.id ? 'border-blue-500' : 'border-gray-200'
              }`}>
                <div className={`w-16 h-16 ${role.color} rounded-xl flex items-center justify-center mb-6 mx-auto`}>
                  <role.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 text-center mb-2">
                  {role.title}
                </h3>
                
                <p className="text-lg text-gray-600 text-center mb-4">
                  {role.subtitle}
                </p>
                
                <p className="text-gray-500 text-center text-sm">
                  {role.description}
                </p>

                {selectedRole === role.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedRole ? 1 : 0.5 }}
          className="flex justify-center"
        >
          <Button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            size="lg"
            className="px-12 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Users className="w-5 h-5 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              'Continue to Profile Setup'
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}