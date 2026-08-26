import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/auth"
import { withdrawalSettledEmail } from "@/lib/mail"
import { triggerNotification, CHANNELS, EVENTS } from "@/lib/pusher"
import prisma from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

/**
 * PATCH { status: "completed" | "rejected", txHash? }
 *
 * Settles a pending withdrawal. Completing it records the payout hash;
 * rejecting it releases the reserved funds back into the investor's
 * withdrawable balance.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminUser(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const status = body.status
    if (status !== "completed" && status !== "rejected") {
      return NextResponse.json({ error: "Status must be completed or rejected" }, { status: 400 })
    }

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    if (existing.type !== "withdrawal") {
      return NextResponse.json({ error: "Only withdrawals can be settled here" }, { status: 400 })
    }
    if (existing.status === "completed" || existing.status === "rejected") {
      return NextResponse.json({ error: "This withdrawal was already settled" }, { status: 400 })
    }

    const txHash = typeof body.txHash === "string" ? body.txHash.trim() : ""
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        txHash: status === "completed" && txHash ? txHash : existing.txHash,
        note: status === "rejected" && typeof body.reason === "string" && body.reason.trim()
          ? `${existing.note ?? ""} · Rejected: ${body.reason.trim()}`.trim()
          : existing.note,
      },
    })

    void withdrawalSettledEmail(existing.user.email, {
      amount: existing.amount,
      approved: status === "completed",
      txHash: transaction.txHash,
      name: existing.user.name,
    })
    void triggerNotification(CHANNELS.USER(existing.userId), EVENTS.WITHDRAWAL_PROCESSED, {
      withdrawalId: id,
      amount: existing.amount,
      status,
      message:
        status === "completed"
          ? `Your $${existing.amount.toLocaleString()} withdrawal has been paid`
          : `Your $${existing.amount.toLocaleString()} withdrawal was rejected`,
    })

    return NextResponse.json({ success: true, transaction: { id: transaction.id, status: transaction.status, txHash: transaction.txHash } })
  } catch (error) {
    console.error("Error settling withdrawal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
