"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PollCreatorProps } from "@/types/enhanced-chat"

export default function PollCreator({ 
  onPollCreate, 
  isOpen, 
  onClose 
}: PollCreatorProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [multipleChoice, setMultipleChoice] = useState(false)
  const [expiresIn, setExpiresIn] = useState<number | undefined>()
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!question.trim()) {
      alert("Please enter a question")
      return
    }

    const validOptions = options.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      alert("Please provide at least 2 options")
      return
    }

    setIsCreating(true)
    try {
      await onPollCreate(question.trim(), validOptions, multipleChoice, expiresIn)
      // Reset form
      setQuestion("")
      setOptions(["", ""])
      setMultipleChoice(false)
      setExpiresIn(undefined)
      onClose()
    } catch (error) {
      console.error('Error creating poll:', error)
      alert('Failed to create poll. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl border-2 border-sage/30 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="roomeo-heading text-xl text-emerald-primary">📊 Create Poll</h3>
              <button 
                onClick={onClose}
                className="text-sage hover:text-emerald-primary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Question
                </label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What should we decide on?"
                  className="w-full"
                  maxLength={200}
                />
              </div>

              {/* Options */}
              <div>
                <label className="roomeo-body font-medium text-emerald-primary mb-2 block">
                  Options
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                        maxLength={100}
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-alert-red hover:text-alert-red/80 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 flex items-center gap-2 text-moss-green hover:text-moss-green/80 transition-colors roomeo-body text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Option
                  </button>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="multipleChoice"
                    checked={multipleChoice}
                    onChange={(e) => setMultipleChoice(e.target.checked)}
                    className="w-4 h-4 text-emerald-primary border-sage/30 rounded focus:ring-emerald-primary"
                  />
                  <label htmlFor="multipleChoice" className="roomeo-body text-emerald-primary">
                    Allow multiple choices
                  </label>
                </div>

                <div>
                  <label className="roomeo-body text-emerald-primary mb-2 block">
                    Poll expires in (hours)
                  </label>
                  <select
                    value={expiresIn || ""}
                    onChange={(e) => setExpiresIn(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full p-2 border-2 border-sage/30 rounded-lg roomeo-body focus:border-moss-green"
                  >
                    <option value="">Never expires</option>
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">1 day</option>
                    <option value="72">3 days</option>
                    <option value="168">1 week</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !question.trim() || options.filter(opt => opt.trim()).length < 2}
                  className="flex-1 roomeo-button-primary"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold-accent/30 border-t-gold-accent"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Poll'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}