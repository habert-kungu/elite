import prisma from "./db"
import { effectiveCycle, formatPlanAmount, planCurrency, planFor, poolLabel } from "./trading"
import { cycleCompletedEmail } from "./mail"
import { triggerNotification, CHANNELS, EVENTS } from "./pusher"

/**
 * A cycle whose clock has run out is finished money. Until it is *recorded* as
 * finished — the cycle closed and a `return` transaction written — the client
 * sees 100% progress on the dashboard but $0 available to withdraw, because
 * the balance counts completed returns only.
 *
 * Admins can close a cycle by hand, but nothing closed one that simply reached
 * the end of its term, so matured funds sat unreachable. This settles those on
 * read: any active cycle at 100% effective progress is completed, its plan
 * closed, and its payout recorded.
 *
 * Idempotent: the `status: "active"` filter on the update is the claim, so
 * concurrent requests can never record the same payout twice.
 *
 * Pass a `userId` to settle one investor (the client's own pages); omit it to
 * settle everyone, which is what the admin views need so their figures match
 * what the investor sees.
 */
export async function settleMaturedCycles(userId?: string): Promise<number> {
  const cycles = await prisma.cycle.findMany({
    where: { status: "active", ...(userId ? { userId } : {}) },
    include: {
      investment: { select: { pool: true, amount: true, status: true } },
      user: { select: { email: true, name: true } },
    },
  })

  const now = Date.now()
  const matured = cycles.filter(
    (c) => c.investment.status === "active" && effectiveCycle(c, c.investment.pool, now).progress >= 100
  )
  if (matured.length === 0) return 0
  let settled = 0

  for (const cycle of matured) {
    const pool = cycle.investment.pool
    const user = cycle.user
    const claimed = await prisma.$transaction(async (tx) => {
      const claim = await tx.cycle.updateMany({
        where: { id: cycle.id, status: "active" },
        data: {
          status: "completed",
          progress: 100,
          currentValue: cycle.targetValue,
          completedAt: new Date(),
        },
      })
      if (claim.count === 0) return false

      // Only close the plan once every cycle under it has finished.
      const stillRunning = await tx.cycle.count({ where: { investmentId: cycle.investmentId, status: "active" } })
      if (stillRunning === 0) {
        await tx.investment.update({ where: { id: cycle.investmentId }, data: { status: "completed" } })
      }

      await tx.transaction.create({
        data: {
          userId: cycle.userId,
          type: "return",
          amount: cycle.targetValue,
          netAmount: cycle.targetValue,
          currency: planCurrency(pool) === "BTC" ? "BTC" : "USDT",
          status: "completed",
          note: `${poolLabel(pool)} cycle completed`,
        },
      })
      return true
    })
    if (!claimed) continue
    settled++

    // Announce it only while it is news. A backlog of long-matured cycles is
    // settled quietly rather than firing a burst of stale "cycle complete"
    // mail at the client.
    if (now - maturedAt(cycle, pool) < 24 * 60 * 60 * 1000) {
      if (user?.email) {
        void cycleCompletedEmail(user.email, {
          amount: cycle.startValue,
          pool,
          returnAmount: cycle.targetValue,
          name: user.name,
        })
      }
      void triggerNotification(CHANNELS.USER(cycle.userId), EVENTS.CYCLE_COMPLETED, {
        investmentId: cycle.investmentId,
        pool: poolLabel(pool, true),
        returnAmount: cycle.targetValue,
        message: `Your ${poolLabel(pool)} cycle completed — ${formatPlanAmount(cycle.targetValue, pool)} is now available.`,
      })
    }
  }

  return settled
}

/** When the cycle hit 100%, given its baseline progress and the plan's term. */
function maturedAt(
  cycle: { progress: number; createdAt: Date; progressAt: Date | null },
  pool: string
): number {
  const stored = Math.max(0, Math.min(100, cycle.progress || 0))
  const term = planFor(pool).durationDays * 24 * 60 * 60 * 1000
  const since = new Date(cycle.progressAt ?? cycle.createdAt).getTime()
  return since + term * ((100 - stored) / 100)
}
