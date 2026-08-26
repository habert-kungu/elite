import prisma from "./db"
import { settleMaturedCycles } from "./settle"

/**
 * Withdrawable funds are **completed returns only** — money from cycles that
 * actually finished — less anything already requested or paid out. Principal
 * still working inside an active cycle is not withdrawable.
 *
 * A cycle that has run its full term counts as finished: the balance settles
 * matured cycles before it counts, so a client never sees $0 available against
 * a plan the dashboard shows at 100%.
 */

export const MIN_WITHDRAWAL_USD = 50

/** A withdrawal reserves its amount unless it was rejected. */
export const RESERVING_WITHDRAWAL_STATUSES = ["pending", "processing", "completed"]

export interface WithdrawableBalance {
  /** Everything paid back to the investor by completed cycles. */
  returns: number
  /** Already withdrawn, plus requests still awaiting payout. */
  withdrawn: number
  /** What can be requested right now. */
  available: number
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export async function withdrawableBalance(userId: string): Promise<WithdrawableBalance> {
  await settleMaturedCycles(userId)

  const [returned, taken] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "return", status: "completed" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "withdrawal", status: { in: RESERVING_WITHDRAWAL_STATUSES } },
    }),
  ])

  const returns = round(returned._sum.amount ?? 0)
  const withdrawn = round(taken._sum.amount ?? 0)
  return { returns, withdrawn, available: Math.max(0, round(returns - withdrawn)) }
}
