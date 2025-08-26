// app/page-simple.tsx - Minimal test page to debug build issues
"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-black text-[#004D40] mb-8">ROOMIO</h1>
        <p className="text-xl text-[#004D40] mb-8">Build Test Page</p>
        <Button 
          onClick={() => setCount(count + 1)}
          className="bg-[#44C76F] hover:bg-[#44C76F]/80 text-[#004D40]"
        >
          Count: {count}
        </Button>
      </div>
    </div>
  )
}