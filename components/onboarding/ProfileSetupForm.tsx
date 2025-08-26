"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { 
  Upload, 
  X, 
  Plus, 
  Camera, 
  User, 
  Home, 
  MapPin, 
  DollarSign,
  Calendar,
  Briefcase,
  Heart,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UserRole, ProfileFormData, RoomDetailsFormData, SeekerPreferencesFormData } from "@/types/user"
import { 
  ROOM_TYPES, 
  LEASE_DURATIONS, 
  YES_NO_OCCASIONALLY, 
  YES_NO_NEGOTIABLE, 
  COMMON_AMENITIES, 
  COMMON_HOBBIES 
} from "@/types/roommate"

// Validation schemas
const baseProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(18, "Must be at least 18 years old").max(100, "Invalid age"),
  gender: z.string().min(1, "Please select your gender"),
  profession: z.string().min(2, "Please enter your profession"),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(500, "Bio must be less than 500 characters"),
  hobbies: z.array(z.string()).min(1, "Please select at least one hobby"),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  smoking: z.enum(["yes", "no", "occasionally"]),
  drinking: z.enum(["yes", "no", "occasionally"]),
  pets: z.enum(["yes", "no", "negotiable"]),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  location: z.string().min(2, "Please enter your location"),
})

const roomDetailsSchema = z.object({
  room_type: z.enum(["private", "shared", "studio", "apartment"]),
  rent_amount: z.number().min(1, "Rent amount is required"),
  deposit_amount: z.number().optional(),
  available_from: z.string().optional(),
  lease_duration: z.enum(["6_months", "1_year", "month_to_month", "flexible"]).optional(),
  furnished: z.boolean(),
  utilities_included: z.boolean(),
  amenities: z.array(z.string()),
  house_rules: z.array(z.string()),
  description: z.string().optional(),
  address: z.string().min(5, "Please enter a valid address"),
  neighborhood: z.string().optional(),
})

const seekerPreferencesSchema = z.object({
  preferred_gender: z.string().optional(),
  age_range_min: z.number().optional(),
  age_range_max: z.number().optional(),
  preferred_location: z.string().optional(),
  max_budget: z.number().optional(),
  preferred_room_type: z.enum(["private", "shared", "studio", "apartment"]).optional(),
  deal_breakers: z.array(z.string()),
})

interface ProfileSetupFormProps {
  userRole: UserRole
  onComplete: (profileData: ProfileFormData, roomData?: RoomDetailsFormData, preferences?: SeekerPreferencesFormData, roomImages?: File[]) => void
  loading?: boolean
}

export default function ProfileSetupForm({ userRole, onComplete, loading = false }: ProfileSetupFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [roomImages, setRoomImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [customHobbies, setCustomHobbies] = useState<string[]>([])
  const [customAmenities, setCustomAmenities] = useState<string[]>([])
  const [houseRules, setHouseRules] = useState<string[]>([])
  const [dealBreakers, setDealBreakers] = useState<string[]>([])

  const totalSteps = userRole === 'provider' ? 3 : 2

  // Form setup
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(baseProfileSchema),
    defaultValues: {
      hobbies: [],
      smoking: 'no',
      drinking: 'no',
      pets: 'no',
    }
  })

  const roomForm = useForm<RoomDetailsFormData>({
    resolver: zodResolver(roomDetailsSchema),
    defaultValues: {
      amenities: [],
      house_rules: [],
      furnished: false,
      utilities_included: false,
    }
  })

  const preferencesForm = useForm<SeekerPreferencesFormData>({
    resolver: zodResolver(seekerPreferencesSchema),
    defaultValues: {
      deal_breakers: [],
    }
  })

  // Image upload handling
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isValidType && isValidSize
    })

    if (validFiles.length + roomImages.length > 10) {
      alert('Maximum 10 images allowed')
      return
    }

    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
    setRoomImages(prev => [...prev, ...validFiles])
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
  }, [roomImages])

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index])
    setRoomImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Form submission
  const handleSubmit = async () => {
    const profileData = profileForm.getValues()
    const roomData = userRole === 'provider' ? roomForm.getValues() : undefined
    const preferences = userRole === 'seeker' ? preferencesForm.getValues() : undefined

    // Add custom arrays to form data
    profileData.hobbies = [...profileData.hobbies, ...customHobbies]
    
    if (roomData) {
      roomData.amenities = [...roomData.amenities, ...customAmenities]
      roomData.house_rules = houseRules
    }

    if (preferences) {
      preferences.deal_breakers = dealBreakers
    }

    // Validate provider images
    if (userRole === 'provider' && roomImages.length < 5) {
      alert('Providers must upload at least 5 room images')
      return
    }

    onComplete(profileData, roomData, preferences, userRole === 'provider' ? roomImages : undefined)
  }

  const nextStep = async () => {
    let isValid = false
    
    if (currentStep === 1) {
      isValid = await profileForm.trigger()
    } else if (currentStep === 2 && userRole === 'provider') {
      isValid = await roomForm.trigger()
      if (isValid && roomImages.length < 5) {
        alert('Please upload at least 5 room images')
        isValid = false
      }
    } else if (currentStep === 2 && userRole === 'seeker') {
      isValid = await preferencesForm.trigger()
    }

    if (isValid) {
      if (currentStep === totalSteps) {
        handleSubmit()
      } else {
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  // Custom input handlers
  const addCustomItem = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (value.trim() && !setter.length) {
      setter(prev => [...prev, value.trim()])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
            <span className="text-sm text-gray-500">{currentStep} of {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                userRole === 'provider' ? 'bg-amber-600' : 'bg-blue-600'
              }`}
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Basic Profile */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      {...profileForm.register("name")}
                      placeholder="Enter your full name"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      {...profileForm.register("age", { valueAsNumber: true })}
                      placeholder="Your age"
                    />
                    {profileForm.formState.errors.age && (
                      <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.age.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Controller
                      name="gender"
                      control={profileForm.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="non-binary">Non-binary</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {profileForm.formState.errors.gender && (
                      <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.gender.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="profession">Profession *</Label>
                    <Input
                      id="profession"
                      {...profileForm.register("profession")}
                      placeholder="What do you do for work?"
                    />
                    {profileForm.formState.errors.profession && (
                      <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.profession.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    {...profileForm.register("location")}
                    placeholder="City, State/Province"
                  />
                  {profileForm.formState.errors.location && (
                    <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.location.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    {...profileForm.register("bio")}
                    placeholder="Tell us about yourself, your lifestyle, and what you're looking for in a roommate..."
                    rows={4}
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-red-600 mt-1">{profileForm.formState.errors.bio.message}</p>
                  )}
                </div>

                {/* Budget Range */}
                {userRole === 'seeker' && (
                  <div>
                    <Label>Budget Range (monthly)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="number"
                          {...profileForm.register("budget_min", { valueAsNumber: true })}
                          placeholder="Min budget"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          {...profileForm.register("budget_max", { valueAsNumber: true })}
                          placeholder="Max budget"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hobbies */}
                <div>
                  <Label>Hobbies & Interests *</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2 mb-4">
                    {COMMON_HOBBIES.map((hobby) => (
                      <label key={hobby} className="flex items-center space-x-2">
                        <Checkbox
                          checked={profileForm.watch("hobbies")?.includes(hobby)}
                          onCheckedChange={(checked) => {
                            const currentHobbies = profileForm.getValues("hobbies") || []
                            if (checked) {
                              profileForm.setValue("hobbies", [...currentHobbies, hobby])
                            } else {
                              profileForm.setValue("hobbies", currentHobbies.filter(h => h !== hobby))
                            }
                          }}
                        />
                        <span className="text-sm">{hobby}</span>
                      </label>
                    ))}
                  </div>
                  {customHobbies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {customHobbies.map((hobby, index) => (
                        <Badge key={index} variant="secondary">
                          {hobby}
                          <button
                            type="button"
                            onClick={() => setCustomHobbies(prev => prev.filter((_, i) => i !== index))}
                            className="ml-1 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lifestyle Questions */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Smoking</Label>
                    <Controller
                      name="smoking"
                      control={profileForm.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YES_NO_OCCASIONALLY.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Drinking</Label>
                    <Controller
                      name="drinking"
                      control={profileForm.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YES_NO_OCCASIONALLY.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Pets</Label>
                    <Controller
                      name="pets"
                      control={profileForm.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {YES_NO_NEGOTIABLE.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {/* Optional fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="religion">Religion (Optional)</Label>
                    <Input
                      id="religion"
                      {...profileForm.register("religion")}
                      placeholder="Your religion"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ethnicity">Ethnicity (Optional)</Label>
                    <Input
                      id="ethnicity"
                      {...profileForm.register("ethnicity")}
                      placeholder="Your ethnicity"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Room Details (Provider) */}
        {currentStep === 2 && userRole === 'provider' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="w-5 h-5 mr-2" />
                  Room Details & Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Room Images */}
                <div>
                  <Label className="flex items-center mb-2">
                    <Camera className="w-4 h-4 mr-2" />
                    Room Photos * (Minimum 5 required)
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="room-images"
                    />
                    <label
                      htmlFor="room-images"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-gray-600">Click to upload room photos</span>
                      <span className="text-sm text-gray-400 mt-1">
                        Max 10 images, 5MB each
                      </span>
                    </label>
                  </div>
                  
                  {imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Room ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center mt-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
                    <span className={`text-sm ${roomImages.length >= 5 ? 'text-green-600' : 'text-amber-600'}`}>
                      {roomImages.length}/5 minimum photos uploaded
                    </span>
                  </div>
                </div>

                {/* Room Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Room Type *</Label>
                    <Controller
                      name="room_type"
                      control={roomForm.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rent_amount">Monthly Rent *</Label>
                    <Input
                      id="rent_amount"
                      type="number"
                      {...roomForm.register("rent_amount", { valueAsNumber: true })}
                      placeholder="Amount in dollars"
                    />
                  </div>

                  <div>
                    <Label htmlFor="deposit_amount">Security Deposit</Label>
                    <Input
                      id="deposit_amount"
                      type="number"
                      {...roomForm.register("deposit_amount", { valueAsNumber: true })}
                      placeholder="Deposit amount"
                    />
                  </div>

                  <div>
                    <Label htmlFor="available_from">Available From</Label>
                    <Input
                      id="available_from"
                      type="date"
                      {...roomForm.register("available_from")}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address">Full Address *</Label>
                  <Input
                    id="address"
                    {...roomForm.register("address")}
                    placeholder="Street address, City, State, ZIP"
                  />
                </div>

                <div>
                  <Label htmlFor="neighborhood">Neighborhood</Label>
                  <Input
                    id="neighborhood"
                    {...roomForm.register("neighborhood")}
                    placeholder="e.g., Downtown, Midtown, etc."
                  />
                </div>

                {/* Checkboxes */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="furnished"
                      {...roomForm.register("furnished")}
                    />
                    <Label htmlFor="furnished">Furnished</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="utilities_included"
                      {...roomForm.register("utilities_included")}
                    />
                    <Label htmlFor="utilities_included">Utilities Included</Label>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <Label>Amenities</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {COMMON_AMENITIES.map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          checked={roomForm.watch("amenities")?.includes(amenity)}
                          onCheckedChange={(checked) => {
                            const currentAmenities = roomForm.getValues("amenities") || []
                            if (checked) {
                              roomForm.setValue("amenities", [...currentAmenities, amenity])
                            } else {
                              roomForm.setValue("amenities", currentAmenities.filter(a => a !== amenity))
                            }
                          }}
                        />
                        <span className="text-sm">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...roomForm.register("description")}
                    placeholder="Describe your room, the house/apartment, and the living situation..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2/3: Seeker Preferences */}
        {((currentStep === 2 && userRole === 'seeker') || (currentStep === 3 && userRole === 'provider')) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  {userRole === 'seeker' ? 'Your Preferences' : 'Roommate Preferences'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {userRole === 'seeker' && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Preferred Gender</Label>
                        <Controller
                          name="preferred_gender"
                          control={preferencesForm.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="No preference" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="any">No Preference</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div>
                        <Label>Preferred Room Type</Label>
                        <Controller
                          name="preferred_room_type"
                          control={preferencesForm.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="No preference" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROOM_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Age Range (Min)</Label>
                        <Input
                          type="number"
                          {...preferencesForm.register("age_range_min", { valueAsNumber: true })}
                          placeholder="18"
                        />
                      </div>

                      <div>
                        <Label>Age Range (Max)</Label>
                        <Input
                          type="number"
                          {...preferencesForm.register("age_range_max", { valueAsNumber: true })}
                          placeholder="65"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Maximum Budget</Label>
                        <Input
                          type="number"
                          {...preferencesForm.register("max_budget", { valueAsNumber: true })}
                          placeholder="Your budget limit"
                        />
                      </div>

                      <div>
                        <Label>Preferred Location</Label>
                        <Input
                          {...preferencesForm.register("preferred_location")}
                          placeholder="City or area"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Deal Breakers */}
                <div>
                  <Label>Deal Breakers (Optional)</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    What are some things you absolutely cannot compromise on?
                  </p>
                  {dealBreakers.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <Input value={item} readOnly />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDealBreakers(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a deal breaker"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const value = e.currentTarget.value
                          if (value.trim()) {
                            setDealBreakers(prev => [...prev, value.trim()])
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement
                        const value = input.value
                        if (value.trim()) {
                          setDealBreakers(prev => [...prev, value.trim()])
                          input.value = ''
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || loading}
          >
            Back
          </Button>

          <Button
            type="button"
            onClick={nextStep}
            disabled={loading}
            className={userRole === 'provider' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {currentStep === totalSteps ? 'Completing...' : 'Processing...'}
              </div>
            ) : (
              currentStep === totalSteps ? 'Complete Profile' : 'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}