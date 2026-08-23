import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [user, deposits, returns, activeCount, completedCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, email: true, name: true, telegram: true, walletAddress: true, role: true, createdAt: true },
      }),
      prisma.investment.aggregate({ _sum: { amount: true }, where: { userId: session.id, status: { in: ["active", "completed"] } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId: session.id, type: "return", status: "completed" } }),
      prisma.investment.count({ where: { userId: session.id, status: "active" } }),
      prisma.investment.count({ where: { userId: session.id, status: "completed" } }),
    ])
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    return NextResponse.json({
      user: { ...user, createdAt: user.createdAt.toISOString() },
      stats: {
        totalDeposits: deposits._sum.amount || 0,
        totalReturns: returns._sum.amount || 0,
        activeInvestments: activeCount,
        completedCycles: completedCount,
      },
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const data: { name?: string; telegram?: string | null; walletAddress?: string | null } = {}

    if (typeof body.name === "string") {
      const name = body.name.trim()
      if (name.length < 2 || name.length > 80) {
        return NextResponse.json({ error: "Name must be 2–80 characters" }, { status: 400 })
      }
      data.name = name
    }
    if (typeof body.telegram === "string") {
      const tg = body.telegram.trim()
      if (tg.length > 64) return NextResponse.json({ error: "Telegram handle is too long" }, { status: 400 })
      data.telegram = tg || null
    }
    if (typeof body.walletAddress === "string") {
      const w = body.walletAddress.trim()
      if (w.length > 128) return NextResponse.json({ error: "Wallet address is too long" }, { status: 400 })
      data.walletAddress = w || null
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: { id: true, email: true, name: true, telegram: true, walletAddress: true, role: true, createdAt: true },
    })
    return NextResponse.json({ success: true, user: { ...user, createdAt: user.createdAt.toISOString() } })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
