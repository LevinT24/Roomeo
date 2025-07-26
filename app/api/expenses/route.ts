import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user expenses
    // - Extract user ID from JWT token
    // - Fetch expenses where user is involved
    // - Calculate balances
    // - Include roommate information

    const mockExpenses = [
      {
        id: "expense_1",
        title: "Rent",
        amount: 1200,
        paidBy: "user_123",
        paidByName: "John Doe",
        splitBetween: ["user_123", "user_456"],
        splitType: "equal",
        category: "housing",
        createdAt: new Date(),
        settled: false,
      },
    ]

    const mockBalance = {
      totalOwed: 150,
      totalOwing: 75,
      netBalance: 75,
    }

    return NextResponse.json({
      success: true,
      expenses: mockExpenses,
      balance: mockBalance,
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const expenseData = await request.json()

    // TODO: Create expense
    // - Extract user ID from JWT token
    // - Validate expense data
    // - Calculate splits
    // - Save to database
    // - Notify involved users

    const newExpense = {
      id: `expense_${Date.now()}`,
      ...expenseData,
      paidBy: "current_user_id",
      createdAt: new Date(),
      settled: false,
    }

    return NextResponse.json({ success: true, expense: newExpense })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to create expense" }, { status: 500 })
  }
}
