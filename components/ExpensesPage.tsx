"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  email: string
  name: string
  profilePicture: string
}

interface ExpensesPageProps {
  user: User
}

export default function ExpensesPage({ user }: ExpensesPageProps) {
  const [expenses] = useState([
    {
      id: "1",
      title: "Rent",
      amount: 1200,
      paidBy: "Liam",
      splitType: "Split evenly",
      icon: "🏠",
    },
    {
      id: "2",
      title: "Utilities",
      amount: 200,
      paidBy: "Sophia",
      splitType: "Split evenly",
      icon: "💡",
    },
    {
      id: "3",
      title: "Groceries",
      amount: 150,
      paidBy: "Liam",
      splitType: "Split unequally",
      icon: "🛒",
    },
    {
      id: "4",
      title: "Internet",
      amount: 50,
      paidBy: "Sophia",
      splitType: "Split evenly",
      icon: "📶",
    },
  ])

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          {/* Header */}
          <header className="flex items-center justify-between whitespace-nowrap border-b-4 border-black px-10 py-4 bg-white">
            <div className="flex items-center gap-3 text-black">
              <div className="w-6 h-6 bg-[#F05224] border-2 border-black transform rotate-3 flex items-center justify-center shadow-[2px_2px_0px_0px_#000000]">
                <span className="text-white font-black text-xs transform -rotate-3">R</span>
              </div>
              <h2 className="text-xl font-black tracking-tight transform -skew-x-3">ROOMIO</h2>
            </div>
            <nav className="flex flex-1 justify-center items-center gap-8">
              <a
                className="text-black hover:text-[#F05224] text-sm font-black transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                href="#"
              >
                DASHBOARD
              </a>
              <a className="text-[#F05224] text-sm font-black border-b-2 border-[#F05224] pb-1" href="#">
                EXPENSES
              </a>
              <a
                className="text-black hover:text-[#F05224] text-sm font-black transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                href="#"
              >
                MARKETPLACE
              </a>
              <a
                className="text-black hover:text-[#F05224] text-sm font-black transition-colors border-b-2 border-transparent hover:border-[#F05224] pb-1"
                href="#"
              >
                MESSAGES
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="relative flex cursor-pointer items-center justify-center rounded-full size-10 bg-white border-2 border-black text-black hover:bg-gray-100 transition-colors">
                <svg fill="currentColor" height="20px" viewBox="0 0 256 256" width="20px">
                  <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"></path>
                </svg>
                <div className="absolute top-1 right-1 size-2 rounded-full bg-[#F05224]"></div>
              </button>
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-black"
                style={{ backgroundImage: `url("${user?.profilePicture || "/placeholder.svg?height=40&width=40"}")` }}
              ></div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-white min-h-[calc(100vh-140px)] overflow-y-auto">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-black tracking-tight mb-2 transform -skew-x-2">EXPENSES</h1>
                  <div className="w-20 h-2 bg-[#F05224] transform skew-x-12"></div>
                </div>

                <Button className="flex min-w-[84px] items-center justify-center gap-2 rounded-md bg-[#F05224] px-6 py-3 text-sm font-black text-white border-4 border-black shadow-[4px_4px_0px_0px_#000000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000] hover:bg-[#D63E1A]">
                  <svg
                    fill="currentColor"
                    height="16"
                    viewBox="0 0 256 256"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
                  </svg>
                  <span>Add Expense</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Your Balance</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
                          style={{ backgroundImage: 'url("/placeholder.svg?height=48&width=48")' }}
                        ></div>
                        <div>
                          <p className="font-semibold text-gray-800">Roommate</p>
                          <p className="text-sm text-emerald-500 font-medium">You are owed $15.00</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-emerald-500">+$15.00</p>
                    </div>
                    <hr className="my-2 border-gray-200" />
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">Total Balance</p>
                      <p className="text-lg font-bold text-emerald-500">+$15.00</p>
                    </div>
                    <button className="w-full mt-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800">
                      Settle up
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Roommates</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
                          style={{
                            backgroundImage: `url("${user?.profilePicture || "/placeholder.svg?height=48&width=48"}")`,
                          }}
                        ></div>
                        <p className="font-semibold text-gray-800">You</p>
                      </div>
                      <p className="text-sm font-medium text-gray-500">Settled up</p>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Recent Expenses</h2>
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {expenses.map((expense) => (
                    <li key={expense.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center rounded-md bg-gray-100 shrink-0 size-12 text-gray-600">
                            <svg fill="currentColor" height="24px" viewBox="0 0 256 256" width="24px">
                              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{expense.title}</p>
                            <p className="text-sm text-gray-500">
                              Paid by {expense.paidBy === user?.id ? "You" : "Roommate"} • Split evenly
                            </p>
                          </div>
                        </div>
                        <p className="text-base font-semibold text-gray-800">${expense.amount.toFixed(2)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
