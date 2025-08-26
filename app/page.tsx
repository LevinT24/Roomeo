// app/page-minimal.tsx - Minimal test without any imports
"use client"

import { useState } from "react"

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>ROOMIO BUILD TEST</h1>
        <button onClick={() => setCount(count + 1)}>
          Count: {count}
        </button>
      </div>
    </div>
  )
}