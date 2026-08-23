import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { newDepositAdminEmail, depositReceivedEmail } from '@/lib/mail'
import { triggerNotification, CHANNELS, EVENTS } from '@/lib/pusher'
import { DEPOSIT_NETWORK_KEYS } from '@/lib/deposit-addresses'
import prisma from '@/lib/db'

import { POOLS, MIN_DEPOSIT_USD, MAX_DEPOSIT_USD } from '@/lib/trading'

const POOL_CONFIG = {
  daily: { roi: POOLS.daily.roiMultiplier, durationDays: POOLS.daily.durationDays },
  weekly: { roi: POOLS.weekly.roiMultiplier, durationDays: POOLS.weekly.durationDays },
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = { userId: session.id }

    const body = await request.json()
    const { amount, pool, txHash, network, notes } = body

    if (!amount || !pool || !txHash) {
      return NextResponse.json(
        { error: 'Amount, pool, and transaction hash are required' },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < MIN_DEPOSIT_USD) {
      return NextResponse.json(
        { error: `Minimum investment is $${MIN_DEPOSIT_USD.toLocaleString()}` },
        { status: 400 }
      )
    }

    if (parsedAmount > MAX_DEPOSIT_USD) {
      return NextResponse.json(
        { error: 'Maximum investment is $1,000,000' },
        { status: 400 }
      )
    }

    if (typeof txHash !== 'string' || txHash.length < 10 || txHash.length > 200) {
      return NextResponse.json(
        { error: 'Invalid transaction hash' },
        { status: 400 }
      )
    }

    const selectedNetwork = typeof network === 'string' && DEPOSIT_NETWORK_KEYS.includes(network) ? network : 'TRC20'

    if (!['daily', 'weekly'].includes(pool)) {
      return NextResponse.json(
        { error: 'Invalid pool selection' },
        { status: 400 }
      )
    }

    const config = POOL_CONFIG[pool as keyof typeof POOL_CONFIG]
    const roi = config.roi

    const investment = await prisma.investment.create({
      data: {
        userId: payload.userId,
        pool,
        amount: parsedAmount,
        txHash: txHash.trim(),
        network: selectedNetwork,
        status: 'pending',
        roi,
      },
    })

    await prisma.transaction.create({
      data: {
        userId: payload.userId,
        type: 'investment',
        amount: parsedAmount,
        netAmount: parsedAmount,
        currency: 'USDT',
        txHash: txHash.trim(),
        status: 'pending',
        note: `Investment submitted for ${pool === 'daily' ? '48H' : 'Weekly'} Pool - Awaiting approval`,
      },
    })

    void depositReceivedEmail(session.email, {
      amount: parsedAmount,
      pool,
      txHash: txHash.trim(),
      investmentId: investment.id,
      roi,
      name: session.name,
    })
    void newDepositAdminEmail({
      userEmail: session.email,
      userName: session.name,
      amount: parsedAmount,
      pool,
      txHash: txHash.trim(),
      investmentId: investment.id,
      network: selectedNetwork,
    })
    void triggerNotification(CHANNELS.ADMIN, EVENTS.INVESTMENT_CREATED, {
      investmentId: investment.id,
      amount: parsedAmount,
      pool,
      message: `${session.name || session.email} submitted a $${parsedAmount} ${pool === 'daily' ? '48H' : 'Weekly'} Pool deposit`,
    })

    return NextResponse.json({
      success: true,
      investment: {
        id: investment.id,
        amount: investment.amount,
        pool: investment.pool,
        status: investment.status,
        createdAt: investment.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating investment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}