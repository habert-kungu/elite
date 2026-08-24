import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { newDepositAdminEmail, depositReceivedEmail } from '@/lib/mail'
import { triggerNotification, CHANNELS, EVENTS } from '@/lib/pusher'
import { DEPOSIT_NETWORK_KEYS } from '@/lib/deposit-addresses'
import prisma from '@/lib/db'

import { PLANS, calculateRoi, formatPlanAmount, isSelectablePlan, validatePlanAmount } from '@/lib/trading'

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

    if (!isSelectablePlan(pool)) {
      return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    const amountError = validatePlanAmount(parsedAmount, pool)
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 })
    }

    if (typeof txHash !== 'string' || txHash.length < 10 || txHash.length > 200) {
      return NextResponse.json(
        { error: 'Invalid transaction hash' },
        { status: 400 }
      )
    }

    const selectedNetwork = typeof network === 'string' && DEPOSIT_NETWORK_KEYS.includes(network) ? network : 'TRC20'

    const plan = PLANS[pool]
    const roi = calculateRoi(parsedAmount, pool)

    const investment = await prisma.investment.create({
      data: {
        userId: payload.userId,
        pool,
        amount: parsedAmount,
        txHash: txHash.trim(),
        network: selectedNetwork,
        currency: plan.currency === 'BTC' ? 'BTC' : 'USDT',
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
        currency: plan.currency === 'BTC' ? 'BTC' : 'USDT',
        txHash: txHash.trim(),
        status: 'pending',
        note: `Investment submitted for ${plan.name} - Awaiting approval`,
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
      message: `${session.name || session.email} submitted a ${formatPlanAmount(parsedAmount, pool)} ${plan.name} deposit`,
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