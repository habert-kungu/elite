import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/auth"
import prisma from "@/lib/db"
import { settleMaturedCycles } from "@/lib/settle"

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminUser(request))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Matured cycles are settled first so paid-out and completed-cycle counts
    // match what investors see on their own dashboards.
    await settleMaturedCycles()

    const [totalUsers, pendingDeposits, activeInvestments, completedCycles, deposited, paidOut, recent] =
      await Promise.all([
        prisma.user.count(),
        prisma.investment.count({ where: { status: "pending" } }),
        prisma.investment.count({ where: { status: "active" } }),
        prisma.cycle.count({ where: { status: "completed" } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: { in: ["deposit", "investment"] }, status: "completed" } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: "return", status: "completed" } }),
        prisma.investment.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true, email: true } } },
        }),
      ])

    return NextResponse.json({
      totalUsers,
      pendingDeposits,
      activeInvestments,
      completedCycles,
      totalDeposited: deposited._sum.amount || 0,
      totalPaidOut: paidOut._sum.amount || 0,
      recentActivity: recent.map((inv) => ({
        id: inv.id,
        userName: inv.user.name || inv.user.email,
        amount: inv.amount,
        pool: inv.pool,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
