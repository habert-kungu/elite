import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { investmentDecisionEmail, cycleCompletedEmail } from '@/lib/mail'
import { calculateRoi, effectiveCycle, formatPlanAmount, isPlanKey, planCurrency, poolLabel } from '@/lib/trading'
import prisma from '@/lib/db'
import { triggerNotification, CHANNELS, EVENTS } from '@/lib/pusher'

export async function PATCH(request: NextRequest) {
  try {
    if (!(await getAdminUser(request))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { investmentId, action } = body

    if (!investmentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action === 'update') return updateInvestment(investmentId, body)

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: { user: { select: { email: true, name: true } } },
    })

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
    }

    if (investment.status !== 'pending') {
      return NextResponse.json({ error: 'Investment already processed' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'active' : 'rejected'
    
    const updated = await prisma.investment.update({
      where: { id: investmentId },
      data: { status: newStatus },
    })

    if (action === 'approve' && updated.status === 'active') {
      const targetValue = updated.amount * updated.roi
      
      const cycle = await prisma.cycle.create({
        data: {
          investmentId: updated.id,
          userId: updated.userId,
          startValue: updated.amount,
          currentValue: updated.amount,
          targetValue,
          progress: 0,
          status: 'active',
        },
      })

      await prisma.transaction.create({
        data: {
          userId: updated.userId,
          type: 'investment',
          amount: updated.amount,
          netAmount: updated.amount,
          currency: 'USDT',
          status: 'completed',
          note: `${poolLabel(updated.pool)} investment activated`,
        },
      })

      triggerNotification(CHANNELS.USER(updated.userId), EVENTS.INVESTMENT_APPROVED, {
        investmentId: updated.id,
        amount: updated.amount,
        pool: updated.pool,
        targetValue,
        cycleId: cycle.id,
        message: `Your ${poolLabel(updated.pool)} investment of ${formatPlanAmount(updated.amount, updated.pool)} has been approved!`,
      })
      void investmentDecisionEmail(investment.user.email, { approved: true, amount: updated.amount, pool: updated.pool, targetValue, name: investment.user.name })
    } else if (action === 'reject') {
      await prisma.transaction.create({
        data: {
          userId: updated.userId,
          type: 'investment',
          amount: updated.amount,
          netAmount: updated.amount,
          currency: 'USDT',
          status: 'rejected',
          note: `Investment rejected`,
        },
      })

      triggerNotification(CHANNELS.USER(updated.userId), EVENTS.INVESTMENT_REJECTED, {
        investmentId: updated.id,
        amount: updated.amount,
        pool: updated.pool,
        message: `Your investment of $${updated.amount} was not approved. Please contact support.`,
      })
      void investmentDecisionEmail(investment.user.email, { approved: false, amount: updated.amount, pool: updated.pool, name: investment.user.name })
    }

    return NextResponse.json({ 
      success: true, 
      investment: {
        id: updated.id,
        status: updated.status,
      }
    })
  } catch (error) {
    console.error('Error updating investment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
/**
 * Admin adjustment of a client's plan. Any subset of:
 *   pool: PlanKey   amount: number   roi: number
 *   status: 'pending' | 'active' | 'completed' | 'rejected'
 *   currentValue: number | progress: number (0–100)   — live cycle position
 * The active cycle is kept consistent (target = amount × roi) so the client's
 * portfolio chart reflects the change immediately. Marking a cycle completed
 * records the payout transaction and notifies the client.
 */
async function updateInvestment(investmentId: string, body: Record<string, unknown>) {
  const investment = await prisma.investment.findUnique({
    where: { id: investmentId },
    include: { user: { select: { email: true, name: true } }, cycles: { orderBy: { createdAt: 'desc' } } },
  })
  if (!investment) return NextResponse.json({ error: 'Investment not found' }, { status: 404 })

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)

  const pool = body.pool === undefined ? investment.pool : body.pool
  if (!isPlanKey(pool)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  const amount = num(body.amount) ?? investment.amount
  if (amount <= 0 || amount > 10_000_000) return NextResponse.json({ error: 'Amount must be between 0 and 10,000,000' }, { status: 400 })
  const roi = num(body.roi) ?? (body.pool !== undefined && body.pool !== investment.pool ? calculateRoi(amount, pool) : investment.roi)
  if (roi < 1 || roi > 100) return NextResponse.json({ error: 'ROI must be between 1x and 100x' }, { status: 400 })
  const status = body.status === undefined ? investment.status : body.status
  if (!['pending', 'active', 'completed', 'rejected'].includes(status as string)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const targetValue = Math.round(amount * roi * 100) / 100
  const existing = investment.cycles.find((c) => c.status === 'active') ?? investment.cycles[0]

  // Resolve the cycle's live position: explicit currentValue wins, then progress %, else keep/scale.
  let currentValue: number | undefined = num(body.currentValue)
  const progressIn = num(body.progress)
  if (currentValue === undefined && progressIn !== undefined) {
    const pct = Math.max(0, Math.min(100, progressIn))
    currentValue = amount + (targetValue - amount) * (pct / 100)
  }
  if (currentValue === undefined && existing) {
    // Keep the same live % when principal/target change (the clock restarts
    // from this baseline, so use the effective position, not the stored one).
    const pct = effectiveCycle(existing, investment.pool).progress / 100
    currentValue = amount + (targetValue - amount) * pct
  }
  if (currentValue === undefined) currentValue = amount
  currentValue = Math.round(Math.max(amount, Math.min(targetValue, currentValue)) * 100) / 100
  const progress = Math.round(((currentValue - amount) / (targetValue - amount || 1)) * 10000) / 100

  const becameCompleted = status === 'completed' && investment.status !== 'completed'
  const becameActive = status === 'active' && investment.status !== 'active'

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.investment.update({
      where: { id: investmentId },
      data: { pool: pool as string, amount, roi, status: status as string, currency: planCurrency(pool) === 'BTC' ? 'BTC' : 'USDT' },
    })

    const cycleData = {
      startValue: amount,
      currentValue: status === 'completed' ? targetValue : currentValue,
      targetValue,
      progress: status === 'completed' ? 100 : progress,
      progressAt: new Date(),
      status: status === 'completed' ? 'completed' : status === 'active' ? 'active' : existing?.status ?? 'active',
      completedAt: status === 'completed' ? existing?.completedAt ?? new Date() : null,
    }
    if (existing) {
      await tx.cycle.update({ where: { id: existing.id }, data: cycleData })
    } else if (status === 'active' || status === 'completed') {
      await tx.cycle.create({ data: { investmentId, userId: inv.userId, ...cycleData } })
    }

    if (becameCompleted) {
      await tx.transaction.create({
        data: {
          userId: inv.userId,
          type: 'return',
          amount: targetValue,
          netAmount: targetValue,
          currency: planCurrency(pool) === 'BTC' ? 'BTC' : 'USDT',
          status: 'completed',
          note: `${poolLabel(pool)} cycle completed`,
        },
      })
    } else if (becameActive) {
      await tx.transaction.create({
        data: {
          userId: inv.userId,
          type: 'investment',
          amount,
          netAmount: amount,
          currency: 'USDT',
          status: 'completed',
          note: `${poolLabel(pool)} investment activated`,
        },
      })
    }
    return inv
  })

  const label = poolLabel(pool)
  if (becameCompleted) {
    void cycleCompletedEmail(investment.user.email, { amount, pool: pool as string, returnAmount: targetValue, name: investment.user.name })
    void triggerNotification(CHANNELS.USER(updated.userId), EVENTS.CYCLE_COMPLETED, {
      investmentId, pool: label, returnAmount: targetValue,
      message: `Your ${label} cycle completed — ${formatPlanAmount(targetValue, pool)} is now available.`,
    })
  } else {
    void triggerNotification(CHANNELS.USER(updated.userId), EVENTS.INVESTMENT_UPDATED, {
      investmentId, pool: label, amount, roi, targetValue, currentValue, progress, status,
      message: `Your ${label} plan was updated: ${formatPlanAmount(amount, pool)} at ${roi}x (target ${formatPlanAmount(targetValue, pool)}).`,
    })
  }

  return NextResponse.json({
    success: true,
    investment: {
      id: updated.id, pool: updated.pool, amount: updated.amount, roi: updated.roi, status: updated.status, targetValue,
      currentValue: status === 'completed' ? targetValue : currentValue,
      progress: status === 'completed' ? 100 : progress,
    },
  })
}
