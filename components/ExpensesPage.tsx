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
          {/* Main Content */}
          <main className="flex-1 px-6 py-6 lg:px-12 xl:px-20 bg-white min-h-screen overflow-y-auto">
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
