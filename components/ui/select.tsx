// Simplified Select component
import * as React from "react"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectValueProps {
  placeholder?: string
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <div className="relative">
      {React.Children.map(children, (child) =>
        React.cloneElement(child as React.ReactElement, { value, onValueChange })
      )}
    </div>
  )
}

export function SelectContent({ children }: SelectContentProps) {
  return (
    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-auto">
      {children}
    </div>
  )
}

export function SelectItem({ value, children }: SelectItemProps) {
  return (
    <div
      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
      data-value={value}
    >
      {children}
    </div>
  )
}

export function SelectTrigger({ children, className = "" }: SelectTriggerProps) {
  return (
    <div className={`border border-gray-300 rounded-md px-3 py-2 bg-white cursor-pointer ${className}`}>
      {children}
    </div>
  )
}

export function SelectValue({ placeholder = "Select..." }: SelectValueProps) {
  return <span className="text-gray-500">{placeholder}</span>
}