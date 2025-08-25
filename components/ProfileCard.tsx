import React from 'react';
import { Card } from '@/components/ui/card';

interface ProfileCardProps {
  profilePicture: string;
  name: string;
  age: number;
  profession: string;
  location: string;
  ethnicity?: string;
  religion?: string;
  housingStatus: 'Has a place' | 'Needs a place';
  budget?: string;
  preferences: {
    pets: boolean;
    smoking: boolean;
    drinking: boolean;
    vegetarian: boolean;
    cleanliness: 'Low' | 'Medium' | 'High';
    noiseLevel: 'Quiet' | 'Moderate' | 'Loud';
    guestPolicy: 'No guests' | 'Occasional guests' | 'Frequent guests';
  };
  hobbies?: string[];
  bio?: string;
  onMessage?: () => void;
  onViewMore?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profilePicture,
  name,
  age,
  profession,
  location,
  ethnicity,
  religion,
  housingStatus,
  budget,
  preferences,
  hobbies,
  bio,
  onMessage,
  onViewMore
}) => {
  const preferenceIcons = {
    pets: '🐕',
    smoking: '🚭',
    drinking: '🍺',
    vegetarian: '🥗',
    cleanliness: '🧹',
    noiseLevel: '🔊',
    guestPolicy: '👥'
  };

  const getPreferenceLabel = (key: keyof typeof preferences, value: any) => {
    switch (key) {
      case 'pets':
        return value ? 'Pet Friendly' : 'No Pets';
      case 'smoking':
        return value ? 'Smoking OK' : 'No Smoking';
      case 'drinking':
        return value ? 'Drinking OK' : 'No Drinking';
      case 'vegetarian':
        return value ? 'Vegetarian' : 'Non-Vegetarian';
      case 'cleanliness':
        return `${value} Cleanliness`;
      case 'noiseLevel':
        return `${value} Noise`;
      case 'guestPolicy':
        return value;
      default:
        return '';
    }
  };

  const getPreferenceColor = (key: keyof typeof preferences, value: any) => {
    const colorMap = {
      pets: value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      smoking: value ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800',
      drinking: value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800',
      vegetarian: value ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
      cleanliness: 'bg-purple-100 text-purple-800',
      noiseLevel: 'bg-indigo-100 text-indigo-800',
      guestPolicy: 'bg-pink-100 text-pink-800'
    };
    return colorMap[key] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ease-in-out border border-gray-200">
        <div className="p-6 space-y-4">
          {/* Profile Picture */}
          <div className="flex justify-center">
            <img
              src={profilePicture}
              alt={`${name}'s profile`}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
          </div>

          {/* Name & Age */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{name}, {age}</h2>
            <p className="text-gray-600 font-medium">{profession}</p>
            <p className="text-gray-500 text-sm">{location}</p>
          </div>

          {/* Optional Demographics */}
          {(ethnicity || religion) && (
            <div className="text-center text-sm text-gray-600 space-y-1">
              {ethnicity && <p>{ethnicity}</p>}
              {religion && <p>{religion}</p>}
            </div>
          )}

          {/* Housing Status */}
          <div className="text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              housingStatus === 'Has a place' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {housingStatus}
            </span>
            {budget && (
              <p className="text-sm text-gray-600 mt-2">{budget}</p>
            )}
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preferences).map(([key, value]) => (
                <span
                  key={key}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPreferenceColor(key as keyof typeof preferences, value)}`}
                >
                  <span className="mr-1">{preferenceIcons[key as keyof typeof preferenceIcons]}</span>
                  {getPreferenceLabel(key as keyof typeof preferences, value)}
                </span>
              ))}
            </div>
          </div>

          {/* Hobbies */}
          {hobbies && hobbies.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Hobbies</h3>
              <div className="flex flex-wrap gap-2">
                {hobbies.map((hobby, index) => (
                  <span
                    key={index}
                    className="inline-block px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 font-medium"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {bio && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{bio}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onMessage}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 hover:scale-105 transform flex items-center justify-center space-x-1"
            >
              <span>Message</span>
              <span>💬</span>
            </button>
            <button
              onClick={onViewMore}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 hover:scale-105 transform flex items-center justify-center space-x-1"
            >
              <span>View More</span>
              <span>🔽</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileCard;