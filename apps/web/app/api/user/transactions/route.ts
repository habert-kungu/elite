import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = payload.userId

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const formatted = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      net: t.netAmount || t.amount,
      fee: t.fee || (t.type !== 'return' ? t.amount - (t.netAmount || t.amount) : 0),
      currency: t.currency,
      status: t.status,
      note: t.note || getNoteForType(t.type, t.amount),
      txHash: t.txHash,
      createdAt: t.createdAt.toISOString(),
    }))

    return NextResponse.json({ transactions: formatted })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getNoteForType(type: string, amount: number): string {
  switch (type) {
    case 'deposit':
      return 'TRC20 Network - Confirmed'
    case 'withdrawal':
      return '16.5% fee applied'
    case 'return':
      return 'Investment cycle completed'
    case 'investment':
      return 'Investment placed'
    default:
      return ''
  }
}