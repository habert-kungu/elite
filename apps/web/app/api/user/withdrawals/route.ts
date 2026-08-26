import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { MIN_WITHDRAWAL_USD, withdrawableBalance } from "@/lib/balance"
import { WITHDRAWAL_TAX_RATE, withdrawalTax } from "@/lib/trading"
import { newWithdrawalAdminEmail, withdrawalRequestedEmail } from "@/lib/mail"
import { triggerNotification, CHANNELS, EVENTS } from "@/lib/pusher"
import prisma from "@/lib/db"

const NETWORKS = ["TRC20", "ERC20", "BEP20"]

/** GET — what the investor can withdraw, plus their withdrawal history. */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [balance, rows] = await Promise.all([
      withdrawableBalance(session.id),
      prisma.transaction.findMany({
        where: { userId: session.id, type: "withdrawal" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ])

    return NextResponse.json({
      balance,
      minimum: MIN_WITHDRAWAL_USD,
      taxRate: WITHDRAWAL_TAX_RATE,
      withdrawals: rows.map((t) => ({
        id: t.id,
        amount: t.amount,
        // Withdrawals are paid in full — the tax was settled separately.
        net: t.amount,
        tax: withdrawalTax(t.amount),
        status: t.status,
        note: t.note,
        txHash: t.txHash,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error loading withdrawals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST — request a withdrawal. The amount is checked against the balance the
 * server computes, never one the client sends, and the request is recorded as
 * a pending transaction so it reserves those funds until an admin settles it.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()

    if (body.taxAcknowledged !== true) {
      return NextResponse.json(
        { error: `Confirm you have deposited the ${(WITHDRAWAL_TAX_RATE * 100).toFixed(1)}% tax for this withdrawal.` },
        { status: 400 }
      )
    }

    const amount = Math.round((typeof body.amount === "number" ? body.amount : parseFloat(String(body.amount))) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 })
    }
    if (amount < MIN_WITHDRAWAL_USD) {
      return NextResponse.json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL_USD}` }, { status: 400 })
    }

    const address = typeof body.address === "string" ? body.address.trim() : ""
    if (address.length < 20 || address.length > 120 || /\s/.test(address)) {
      return NextResponse.json({ error: "Enter a valid USDT wallet address" }, { status: 400 })
    }

    const network = NETWORKS.includes(body.network) ? body.network : "TRC20"

    const balance = await withdrawableBalance(session.id)
    if (amount > balance.available) {
      return NextResponse.json(
        { error: `You can withdraw up to $${balance.available.toLocaleString()} right now.`, balance },
        { status: 400 }
      )
    }

    const tax = withdrawalTax(amount)
    const withdrawal = await prisma.transaction.create({
      data: {
        userId: session.id,
        type: "withdrawal",
        amount,
        // Paid in full: the tax was deposited separately, never withheld here.
        netAmount: amount,
        fee: 0,
        currency: "USDT",
        status: "pending",
        note: `To ${address} (${network}) · ${(WITHDRAWAL_TAX_RATE * 100).toFixed(1)}% tax ($${tax.toLocaleString()}) settled separately`,
      },
    })

    // Remember the address so the next request can prefill it.
    await prisma.user.update({ where: { id: session.id }, data: { walletAddress: address } })

    void withdrawalRequestedEmail(session.email, { amount, tax, network, address, name: session.name })
    void newWithdrawalAdminEmail({
      userEmail: session.email,
      userName: session.name,
      amount,
      tax,
      network,
      address,
      withdrawalId: withdrawal.id,
    })
    void triggerNotification(CHANNELS.ADMIN, EVENTS.WITHDRAWAL_REQUESTED, {
      withdrawalId: withdrawal.id,
      amount,
      message: `${session.name || session.email} requested a $${amount.toLocaleString()} withdrawal`,
    })

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        tax,
        network,
        address,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt.toISOString(),
      },
      balance: await withdrawableBalance(session.id),
    })
  } catch (error) {
    console.error("Error creating withdrawal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
