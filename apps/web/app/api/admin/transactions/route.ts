import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminUser(request))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "12", 10) || 12))
    const where = type && type !== "all" ? { type } : {}

    const [total, rows, sums] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.groupBy({ by: ["type"], _sum: { netAmount: true, amount: true }, where: { status: "completed" } }),
    ])

    const sumFor = (t: string) => {
      const g = sums.find((s) => s.type === t)
      return g?._sum.netAmount ?? g?._sum.amount ?? 0
    }

    return NextResponse.json({
      transactions: rows.map((t) => ({
        id: t.id,
        userId: t.user.id,
        user: t.user.name || t.user.email,
        userEmail: t.user.email,
        type: t.type,
        amount: t.amount,
        fee: t.fee ?? 0,
        net: t.netAmount ?? t.amount,
        status: t.status,
        note: t.note,
        txHash: t.txHash,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      stats: {
        deposits: sumFor("deposit") + sumFor("investment"),
        returns: sumFor("return"),
        withdrawals: sumFor("withdrawal"),
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
