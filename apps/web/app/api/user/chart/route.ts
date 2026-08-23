import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import prisma from "@/lib/db"

function generateMarketData(
  startValue: number,
  targetValue: number,
  points: number = 48
): { time: string; price: number }[] {
  const data: { time: string; price: number }[] = []
  const totalGain = targetValue - startValue
  const progressPerPoint = 1 / points

  let currentValue = startValue
  const baseTime = new Date()
  baseTime.setHours(0, 0, 0, 0)

  for (let i = 0; i < points; i++) {
    const time = new Date(baseTime.getTime() + i * 30 * 60 * 1000)
    const expectedProgress = (i + 1) * progressPerPoint
    const expectedValue = startValue + totalGain * expectedProgress

    const volatility = totalGain * 0.08
    const randomWalk = (Math.random() - 0.5) * 2 * volatility

    const momentum = Math.sin((i / points) * Math.PI) * (totalGain * 0.05)

    currentValue = expectedValue + randomWalk + momentum
    currentValue = Math.max(
      startValue * 0.95,
      Math.min(targetValue * 1.02, currentValue)
    )

    data.push({
      time: time.toISOString(),
      price: Math.round(currentValue * 100) / 100,
    })
  }

  const lastItem = data[data.length - 1]
  if (lastItem) {
    lastItem.price = targetValue
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = payload.userId

    const investments = await prisma.investment.findMany({
      where: { userId, status: "active" },
      include: { cycles: true },
    })

    if (investments.length === 0) {
      return NextResponse.json({ data: [], message: "No active investments" })
    }

    const activeCycles = investments.flatMap((inv) =>
      inv.cycles.filter((c) => c.status === "active")
    )

    if (activeCycles.length === 0) {
      return NextResponse.json({ data: [], message: "No active cycles" })
    }

    const chartData = activeCycles.map((cycle) => {
      const data = generateMarketData(cycle.startValue, cycle.targetValue, 48)
      return {
        cycleId: cycle.id,
        pool:
          investments.find((i) => i.id === cycle.investmentId)?.pool ||
          "weekly",
        data,
      }
    })

    return NextResponse.json({ cycles: chartData })
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
