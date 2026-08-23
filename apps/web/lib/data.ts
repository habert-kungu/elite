import { Investment, UserStats, CycleProgress, generateChartData } from './trading'

export const MOCK_INVESTMENTS: Investment[] = [
  {
    id: 'inv_001',
    userId: 'user_001',
    pool: 'weekly',
    amount: 500,
    txHash: '0x1234567890abcdef',
    network: 'TRC20',
    status: 'active',
    createdAt: new Date('2026-04-27T10:00:00Z'),
  },
  {
    id: 'inv_002',
    userId: 'user_001',
    pool: 'daily',
    amount: 1000,
    txHash: '0xabcdef123456',
    network: 'TRC20',
    status: 'completed',
    createdAt: new Date('2026-04-25T10:00:00Z'),
    completedAt: new Date('2026-04-26T10:00:00Z'),
  },
]

export function getUserInvestments(userId: string): Investment[] {
  return MOCK_INVESTMENTS.filter(i => i.userId === userId)
}

export function getUserStats(userId: string): UserStats {
  const investments = getUserInvestments(userId)
  
  const activeInvestments = investments.filter(i => i.status === 'active' || i.status === 'pending')
  const completedInvestments = investments.filter(i => i.status === 'completed')
  
  const activeCycles: CycleProgress[] = activeInvestments.map(investment => {
    const now = new Date()
    const startTime = new Date(investment.createdAt)
    const config = investment.pool === 'daily' ? { durationDays: 2 } : { durationDays: 7 }
    const endTime = new Date(startTime.getTime() + config.durationDays * 24 * 60 * 60 * 1000)
    
    const totalMs = endTime.getTime() - startTime.getTime()
    const elapsedMs = now.getTime() - startTime.getTime()
    
    const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))
    
    const targetValue = investment.pool === 'daily' 
      ? investment.amount * 10 
      : investment.amount * 8
    
    const currentValue = investment.amount + (targetValue - investment.amount) * (progressPercent / 100)
    
    const daysRemaining = Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    
    return {
      investment,
      startValue: investment.amount,
      currentValue: Math.round(currentValue * 100) / 100,
      targetValue,
      progressPercent: Math.round(progressPercent * 10) / 10,
      daysRemaining,
      status: progressPercent >= 100 ? 'completed' : 'active',
      marketFluctuations: [],
    }
  })
  
  const totalAssets = completedInvestments.reduce((sum, i) => {
    const ret = i.pool === 'daily' ? i.amount * 10 : i.amount * 10
    return sum + ret
  }, 0) + activeInvestments.reduce((sum, i) => sum + i.amount, 0)
  
  const pendingReturns = activeCycles
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.targetValue - c.currentValue), 0)
  
  const totalProfit = completedInvestments.reduce((sum, i) => {
    const ret = i.pool === 'daily' ? i.amount * 10 : i.amount * 10
    return sum + (ret - i.amount)
  }, 0)
  
  return {
    totalAssets: Math.round(totalAssets * 100) / 100,
    yesterdayPnl: 320.50,
    pendingReturns: Math.round(pendingReturns * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    activeCycles,
  }
}

export function getUserChartData(userId: string) {
  const investments = getUserInvestments(userId)
  const activeInvestment = investments.find(i => i.status === 'active')
  
  if (!activeInvestment) {
    return []
  }
  
  return generateChartData(activeInvestment, 10)
}