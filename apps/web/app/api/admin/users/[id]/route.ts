import { NextRequest, NextResponse } from "next/server"
import { getAdminUser, hashPassword, isStrongEnoughPassword, createPasswordResetToken } from "@/lib/auth"
import { appUrl } from "@/lib/mail"
import { passwordResetByAdminEmail } from "@/lib/mail"
import prisma from "@/lib/db"
import { settleMaturedCycles } from "@/lib/settle"
import { effectiveCycle } from "@/lib/trading"

type Ctx = { params: Promise<{ id: string }> }

/** GET: everything the admin needs about one investor. */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    if (!(await getAdminUser(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, telegram: true, walletAddress: true, role: true, createdAt: true, twoFactorEnabled: true },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Settle this investor's matured cycles so the admin sees the same
    // returns and withdrawable figure the client does.
    await settleMaturedCycles(id)

    const [investments, transactions] = await Promise.all([
      prisma.investment.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        include: { cycles: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      prisma.transaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
    ])

    const deposited = investments.filter((i) => ["active", "completed"].includes(i.status)).reduce((s, i) => s + i.amount, 0)
    const returns = transactions.filter((t) => t.type === "return" && t.status === "completed").reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({
      user: { ...user, createdAt: user.createdAt.toISOString() },
      stats: {
        deposited,
        returns,
        active: investments.filter((i) => i.status === "active").length,
        pending: investments.filter((i) => i.status === "pending").length,
        completed: investments.filter((i) => i.status === "completed").length,
      },
      investments: investments.map((inv) => {
        const c = inv.cycles[0]
        const live = c ? effectiveCycle(c, inv.pool) : null
        return {
          id: inv.id,
          userId: inv.userId,
          userName: user.name || user.email,
          userEmail: user.email,
          amount: inv.amount,
          pool: inv.pool,
          roi: inv.roi,
          status: inv.status,
          txHash: inv.txHash,
          network: inv.network,
          createdAt: inv.createdAt.toISOString(),
          cycle: c && live ? { currentValue: live.currentValue, targetValue: c.targetValue, progress: live.progress, status: c.status } : null,
        }
      }),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        net: t.netAmount ?? t.amount,
        fee: t.fee ?? 0,
        status: t.status,
        note: t.note,
        txHash: t.txHash,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error loading user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    if (id === admin.id) {
      return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

    if (target.role === "admin") {
      const admins = await prisma.user.count({ where: { role: "admin" } })
      if (admins <= 1) {
        return NextResponse.json({ error: "Can't remove the last admin" }, { status: 400 })
      }
    }

    // Delete dependents explicitly (oldest → newest FK order) so this works on
    // databases created before the schema gained ON DELETE CASCADE.
    await prisma.$transaction([
      prisma.cycle.deleteMany({ where: { userId: id } }),
      prisma.transaction.deleteMany({ where: { userId: id } }),
      prisma.investment.deleteMany({ where: { userId: id } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const data: { role?: string; name?: string; telegram?: string | null } = {}

    // Two-step verification is mandatory — not even an admin can switch it off.
    if (body.twoFactorEnabled === false) {
      return NextResponse.json({ error: "Two-step verification is required and can't be turned off." }, { status: 403 })
    }

    if (body.role !== undefined) {
      if (!["admin", "user"].includes(body.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }
      if (id === admin.id && body.role !== "admin") {
        return NextResponse.json({ error: "You can't demote your own account" }, { status: 400 })
      }
      if (body.role !== "admin") {
        // Never let the platform end up with nobody who can administer it.
        const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
        if (target.role === "admin" && (await prisma.user.count({ where: { role: "admin" } })) <= 1) {
          return NextResponse.json({ error: "Can't revoke the last admin" }, { status: 400 })
        }
      }
      data.role = body.role
    }
    if (typeof body.name === "string") data.name = body.name.trim()
    if (typeof body.telegram === "string") data.telegram = body.telegram.trim() || null

    const user = await prisma.user.update({
      where: { id },
      // A role change invalidates the user's sessions so the old role can't linger in a JWT.
      data: data.role !== undefined ? { ...data, tokenVersion: { increment: 1 } } : data,
      select: { id: true, email: true, name: true, telegram: true, role: true, twoFactorEnabled: true },
    })
    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST { action: "resetPassword", password? }
 * Default: signs the user out everywhere and emails a single-use "choose a new
 * password" link (24h). The link is returned to the admin only when it could
 * not be emailed. With an explicit `password`, sets it directly instead.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    if (body.action !== "resetPassword") return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    if (body.password !== undefined && body.password !== "" && !isStrongEnoughPassword(body.password)) {
      return NextResponse.json({ error: "Password must be 6–128 characters" }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } })
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

    if (body.password) {
      await prisma.user.update({ where: { id }, data: { password: await hashPassword(body.password), tokenVersion: { increment: 1 } } })
      await prisma.passwordResetToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: new Date() } })
      return NextResponse.json({ success: true, email: target.email, emailSent: false, mode: "password", sessionsRevoked: true })
    }

    // Sign out everywhere now; the user picks a new password via the link.
    await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } })
    const token = await createPasswordResetToken(id, 24 * 60 * 60 * 1000)
    const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`)
    const mail = await passwordResetByAdminEmail(target.email, link, target.name)
    return NextResponse.json({
      success: true,
      email: target.email,
      emailSent: mail.sent,
      mode: "link",
      link: mail.sent ? undefined : link,
      sessionsRevoked: true,
    })
  } catch (error) {
    console.error("Error resetting user password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
