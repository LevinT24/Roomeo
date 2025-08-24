"[^"]*"

import { useState } from "[^"]*"
import { motion } from "[^"]*"
import { Home, Search, Crown, Users } from "[^"]*"
import { Button } from "[^"]*"
import type { UserRole } from "[^"]*"

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
    <div className="[^"]*">
      <div className="[^"]*">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="[^"]*"
        >
          <h1 className="[^"]*">
            Welcome to <span className="[^"]*">Roomeo</span>
          </h1>
          <p className="[^"]*">
            Find your perfect roommate match! First, let us know what you&apos;re looking for.
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <div className="[^"]*">
          {/* Seeker Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 cursor-pointer group ${
              selectedRole === &apos;seeker&apos; 
                ? &apos;border-blue-500 shadow-2xl shadow-blue-500/25&apos; 
                : &apos;border-gray-200 hover:border-blue-300 hover:shadow-2xl&apos;
            }`}
            onClick={() => handleRoleSelect(&apos;seeker&apos;)}
          >
            <div className="[^"]*">
              {/* Icon */}
              <div className="[^"]*">
                <Search className="[^"]*" />
              </div>

              {/* Content */}
              <h3 className="[^"]*">
                I&apos;m a Seeker
              </h3>
              <p className="[^"]*">
                Looking for a room or roommate? Browse available spaces and connect with compatible roommates.
              </p>

              {/* Features */}
              <ul className="[^"]*">
                <li className="[^"]*">
                  <div className="[^"]*"></div>
                  Browse available rooms
                </li>
                <li className="[^"]*">
                  <div className="[^"]*"></div>
                  Set your preferences
                </li>
                <li className="[^"]*">
                  <div className="[^"]*"></div>
                  Match with providers
                </li>
              </ul>

              {/* Button */}
              <Button 
                className="[^"]*"
                disabled={loading}
              >
                {selectedRole === &apos;seeker&apos; && loading ? (
                  <div className="[^"]*">
                    <div className="[^"]*"></div>
                    Setting up...
                  </div>
                ) : (
                  <>
                    <Users className="[^"]*" />
                    Choose Seeker
                  </>
                )}
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="[^"]*"></div>
            <div className="[^"]*"></div>
          </motion.div>

          {/* Provider Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl shadow-xl border-2 transition-all duration-300 cursor-pointer group ${
              selectedRole === &apos;provider&apos; 
                ? &apos;border-amber-300 shadow-2xl shadow-amber-500/25&apos; 
                : &apos;border-amber-500 hover:border-amber-300 hover:shadow-2xl&apos;
            }`}
            onClick={() => handleRoleSelect(&apos;provider&apos;)}
          >
            <div className="[^"]*">
              {/* Icon */}
              <div className="[^"]*">
                <Home className="[^"]*" />
              </div>

              {/* Content */}
              <h3 className="[^"]*">
                I&apos;m a Provider
              </h3>
              <p className="[^"]*">
                Have a room to offer? Showcase your space and find the perfect roommate match.
              </p>

              {/* Features */}
              <ul className="[^"]*">
                <li className="[^"]*">
                  <div className="[^"]*"></div>
                  List your room with photos
                </li>
                <li className="[^"]*">
                  <div className="[^"]*"></div>
                  Set your requirements
                </li>
                <li className="[^"]*">
                  <div className="[^"]*"></div>
                  Match with seekers
                </li>
              </ul>

              {/* Button */}
              <Button 
                className="[^"]*"
                disabled={loading}
              >
                {selectedRole === &apos;provider&apos; && loading ? (
                  <div className="[^"]*">
                    <div className="[^"]*"></div>
                    Setting up...
                  </div>
                ) : (
                  <>
                    <Crown className="[^"]*" />
                    Choose Provider
                  </>
                )}
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="[^"]*"></div>
            <div className="[^"]*"></div>
            
            {/* Crown decoration */}
            <div className="[^"]*">
              <Crown className="[^"]*" />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="[^"]*"
        >
          <p className="[^"]*">
            You can always change your role later in your profile settings
          </p>
        </motion.div>
      </div>
    </div>
  )
}