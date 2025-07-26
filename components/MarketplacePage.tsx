"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

interface MarketplacePageProps {
  user: User
}

export default function MarketplacePage({ user }: MarketplacePageProps) {
  const [items] = useState([
    {
      id: "1",
      title: "Vintage Desk Lamp",
      price: 35,
      location: "New York, NY",
      image: "/placeholder.svg?height=200&width=200&text=Desk+Lamp",
    },
    {
      id: "2",
      title: "Cozy Armchair",
      price: 120,
      location: "San Francisco, CA",
      image: "/placeholder.svg?height=200&width=200&text=Armchair",
    },
    {
      id: "3",
      title: "Kitchen Utensil Set",
      price: 25,
      location: "Chicago, IL",
      image: "/placeholder.svg?height=200&width=200&text=Kitchen+Set",
    },
    {
      id: "4",
      title: "Wall Art - Abstract",
      price: 45,
      location: "Austin, TX",
      image: "/placeholder.svg?height=200&width=200&text=Wall+Art",
    },
    {
      id: "5",
      title: "Bookshelf - Modern",
      price: 80,
      location: "Seattle, WA",
      image: "/placeholder.svg?height=200&width=200&text=Bookshelf",
    },
    {
      id: "6",
      title: "Coffee Table - Glass Top",
      price: 70,
      location: "Miami, FL",
      image: "/placeholder.svg?height=200&width=200&text=Coffee+Table",
    },
  ])

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <a className="flex items-center gap-2 text-xl font-black text-black" href="#">
                  <div className="h-6 w-6 bg-[#F05224] border-2 border-black transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000]">
                    <span className="text-white font-black text-xs transform -rotate-3">R</span>
                  </div>
                  <span className="transform -skew-x-3">ROOMIO</span>
                </a>
                <nav className="hidden md:flex items-center gap-6">
                  <a
                    className="text-sm font-black text-black hover:text-[#F05224] transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                    href="#"
                  >
                    HOME
                  </a>
                  <a
                    className="text-sm font-black text-black hover:text-[#F05224] transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                    href="#"
                  >
                    EXPENSES
                  </a>
                  <a className="text-sm font-black text-[#F05224] border-b-2 border-[#F05224] pb-1" href="#">
                    MARKETPLACE
                  </a>
                  <a
                    className="text-sm font-black text-black hover:text-[#F05224] transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                    href="#"
                  >
                    MATCHES
                  </a>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <button className="rounded-full p-2 text-black hover:bg-gray-100 hover:text-[#F05224] border-2 border-black">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </button>
                <div
                  className="h-10 w-10 rounded-full bg-cover bg-center border-2 border-black"
                  style={{ backgroundImage: `url("${user?.profilePicture || "/placeholder.svg?height=40&width=40"}")` }}
                ></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-6 min-h-[calc(100vh-140px)] overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-black text-black mb-2 transform -skew-x-2">MARKETPLACE</h1>
                <div className="w-20 h-2 bg-[#F05224] transform skew-x-12"></div>
              </div>
              <div className="w-full md:w-auto flex items-center gap-4">
                <div className="relative flex-grow">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        clipRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        fillRule="evenodd"
                      ></path>
                    </svg>
                  </span>
                  <Input
                    className="w-full rounded-lg border-4 border-black py-2.5 pl-10 pr-4 text-sm font-bold focus:border-[#F05224] focus:ring-[#F05224]"
                    placeholder="SEARCH FOR ITEMS..."
                    type="search"
                  />
                </div>

                <Button className="bg-[#F05224] hover:bg-[#D63E1A] text-white font-black px-6 py-3 text-sm border-4 border-black shadow-[4px_4px_0px_0px_#000000] transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000] transition-all whitespace-nowrap">
                  SELL ITEM
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group cursor-pointer overflow-hidden rounded-lg bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000]"
                >
                  <div className="relative">
                    <div className="aspect-square w-full overflow-hidden">
                      <img
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        src={item.image || "/placeholder.svg"}
                      />
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-[#F05224] border-2 border-black p-1.5 shadow-[2px_2px_0px_0px_#000000]">
                      <span className="text-sm font-black text-white">${item.price}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-black text-black truncate transform -skew-x-1">{item.title}</h3>
                    <p className="text-sm font-bold text-gray-700">{item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
