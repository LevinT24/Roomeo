"use client"

import { useState, useRef } from "react"
import type { FileUploadProps } from "@/types/enhanced-chat"

export default function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ["image/*", ".pdf", ".doc", ".docx", ".txt"],
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return

    const file = files[0]
    
    // Validate file size
    if (file.size > maxSize) {
      alert(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    // Validate file type
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      return file.type.match(type)
    })

    if (!isValidType) {
      alert(`Invalid file type. Accepted types: ${acceptedTypes.join(', ')}`)
      return
    }

    setIsUploading(true)
    try {
      await onFileUpload(file)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
      
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          dragActive 
            ? 'border-emerald-primary bg-sage/10' 
            : 'border-sage/30 hover:border-sage/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-sage/30 border-t-emerald-primary"></div>
            <p className="roomeo-body text-emerald-primary">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="roomeo-body text-emerald-primary mb-1">
                Drop files here or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-moss-green hover:underline font-medium"
                >
                  browse
                </button>
              </p>
              <p className="roomeo-body text-xs text-sage">
                Max {Math.round(maxSize / 1024 / 1024)}MB • {acceptedTypes.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}