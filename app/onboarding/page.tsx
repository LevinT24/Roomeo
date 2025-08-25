"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    // Add navigation logic here based on the selected option
    setTimeout(() => {
      switch (option) {
        case 'seeker':
          router.push('/marketplace');
          break;
        case 'provider':
          router.push('/add-listing');
          break;
        case 'guest':
          router.push('/browse');
          break;
        default:
          break;
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How would you like to continue?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose your path to finding the perfect roommate experience
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {/* Seeker Option */}
          <div
            onClick={() => handleOptionSelect('seeker')}
            className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 ${
              selectedOption === 'seeker' ? 'scale-105 -translate-y-2' : ''
            }`}
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 h-full flex flex-col items-center text-center">
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                🏠
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Seeker
              </h3>
              <p className="text-gray-600 text-lg mb-6 flex-grow">
                Find your perfect room
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>

          {/* Provider Option */}
          <div
            onClick={() => handleOptionSelect('provider')}
            className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 ${
              selectedOption === 'provider' ? 'scale-105 -translate-y-2' : ''
            }`}
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 h-full flex flex-col items-center text-center">
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                🏡
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Provider
              </h3>
              <p className="text-gray-600 text-lg mb-6 flex-grow">
                Offer your space & connect
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>

          {/* Guest Option */}
          <div
            onClick={() => handleOptionSelect('guest')}
            className={`group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 ${
              selectedOption === 'guest' ? 'scale-105 -translate-y-2' : ''
            }`}
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 h-full flex flex-col items-center text-center">
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                👤
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Continue as Guest
              </h3>
              <p className="text-gray-600 text-lg mb-6 flex-grow">
                Look around freely
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            You can always change this later in your settings
          </p>
        </div>
      </div>
    </div>
  );
}