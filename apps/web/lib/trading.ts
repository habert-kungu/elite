export type PoolType = 'daily' | 'weekly'

export interface PoolConfig {
  name: PoolType
  durationDays: number
  roiMultiplier: number
}

export const POOLS: Record<PoolType, PoolConfig> = {
  // `daily` is the stored key for the 48-hour pool (kept for existing rows).
  daily: {
    name: 'daily',
    durationDays: 2,
    roiMultiplier: 10,
  },
  weekly: {
    name: 'weekly',
    durationDays: 7,
    roiMultiplier: 10,
  },
}

export const MIN_DEPOSIT_USD = 500
export const MAX_DEPOSIT_USD = 1_000_000

export const WITHDRAWAL_TAX_RATE = 0.165 // 16.5%

/**
 * Live position of a cycle. The stored `progress` is a baseline set at
 * `progressAt` (approval or the latest admin adjustment); an active cycle then
 * advances from that baseline with elapsed time over the pool's duration. So
 * an admin can set it to any value — higher or lower — and the clock carries
 * on from there. Non-active statuses return the stored values untouched.
 */
export function effectiveCycle(
  cycle: { startValue: number; currentValue: number; targetValue: number; progress: number; status: string; createdAt: Date | string; progressAt?: Date | string | null },
  pool: string,
  now: number = Date.now()
): { progress: number; currentValue: number; timeProgress: number } {
  const stored = Math.max(0, Math.min(100, cycle.progress || 0))
  if (cycle.status !== 'active') return { progress: stored, currentValue: cycle.currentValue, timeProgress: stored }
  const days = (POOLS[pool as PoolType] ?? POOLS.weekly).durationDays
  const since = new Date(cycle.progressAt ?? cycle.createdAt).getTime()
  const elapsed = Math.max(0, now - since)
  const timeProgress = Math.max(0, Math.min(100, (elapsed / (days * 24 * 60 * 60 * 1000)) * 100))
  const progress = Math.min(100, stored + timeProgress)
  const currentValue = cycle.startValue + (cycle.targetValue - cycle.startValue) * (progress / 100)
  return {
    progress: Math.round(progress * 100) / 100,
    currentValue: Math.round(currentValue * 100) / 100,
    timeProgress: Math.round(timeProgress * 100) / 100,
  }
}

/** Human label for a stored pool key. */
export function poolLabel(pool: string, short = false): string {
  if (pool === 'daily') return short ? '48H' : '48H Pool'
  return short ? 'Weekly' : 'Weekly Pool'
}

export interface Investment {
  id: string
  userId: string
  pool: PoolType
  amount: number
  txHash: string
  status: 'pending' | 'active' | 'completed' | 'rejected'
  createdAt: Date
  completedAt?: Date
  network: string
  notes?: string
}

export interface CycleProgress {
  investment: Investment
  startValue: number
  currentValue: number
  targetValue: number
  progressPercent: number
  daysRemaining: number
  status: 'active' | 'completed' | 'pending'
  marketFluctuations: number[]
}

export interface UserStats {
  totalAssets: number
  yesterdayPnl: number
  pendingReturns: number
  totalProfit: number
  activeCycles: CycleProgress[]
}

export interface WithdrawalCalculation {
  grossAmount: number
  taxAmount: number
  netAmount: number
}

export function calculateTargetReturn(amount: number, pool: PoolType): number {
  const config = POOLS[pool]
  if (!config || !Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * config.roiMultiplier)
}

export function calculateWithdrawal(amount: number): WithdrawalCalculation {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0
  const taxAmount = Math.round(safeAmount * WITHDRAWAL_TAX_RATE * 100) / 100
  const netAmount = Math.round((safeAmount - taxAmount) * 100) / 100
  return {
    grossAmount: Math.round(safeAmount * 100) / 100,
    taxAmount,
    netAmount,
  }
}

export function generateMarketFluctuations(days: number, targetValue: number, startValue: number): number[] {
  const fluctuations: number[] = []
  const totalDays = Math.max(1, Math.floor(Number.isFinite(days) ? days : 1))
  const progressPerDay = 1 / totalDays
  const totalGain = targetValue - startValue

  for (let day = 0; day < totalDays; day++) {
    const expectedProgress = (day + 1) * progressPerDay
    const baseValue = startValue + (totalGain * expectedProgress)
    
    const noise = (Math.random() - 0.5) * (totalGain * 0.15)
    const dailyValue = Math.max(startValue, Math.min(targetValue, baseValue + noise))
    fluctuations.push(Math.round(dailyValue * 100) / 100)
  }
  
  return fluctuations
}

export function calculateCycleProgress(investment: Investment): CycleProgress {
  const config = POOLS[investment.pool]
  const now = new Date()
  const startTime = new Date(investment.createdAt)
  const endTime = new Date(startTime.getTime() + config.durationDays * 24 * 60 * 60 * 1000)
  
  const totalMs = endTime.getTime() - startTime.getTime()
  const elapsedMs = now.getTime() - startTime.getTime()

  const progressPercent = totalMs > 0
    ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))
    : 100

  const targetValue = calculateTargetReturn(investment.amount, investment.pool)

  const totalDays = Math.max(1, config.durationDays)
  const currentDay = Math.floor((progressPercent / 100) * totalDays)
  const fluctuations = generateMarketFluctuations(totalDays, targetValue, investment.amount)
  const fallback = investment.amount
  const currentValue = fluctuations.length > 0
    ? fluctuations[Math.min(Math.max(0, currentDay), fluctuations.length - 1)] ?? fallback
    : fallback
  
  const daysRemaining = Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
  
  let status: 'active' | 'completed' | 'pending' = 'pending'
  if (investment.status === 'active') {
    status = progressPercent >= 100 ? 'completed' : 'active'
  } else if (investment.status === 'completed') {
    status = 'completed'
  }
  
  return {
    investment,
    startValue: investment.amount,
    currentValue: Math.round(currentValue * 100) / 100,
    targetValue,
    progressPercent: Math.round(progressPercent * 10) / 10,
    daysRemaining,
    status,
    marketFluctuations: fluctuations,
  }
}

export function calculateUserStats(investments: Investment[]): UserStats {
  const activeInvestments = investments.filter(i => i.status === 'active' || i.status === 'pending')
  const completedInvestments = investments.filter(i => i.status === 'completed')
  
  const activeCycles = activeInvestments.map(calculateCycleProgress)
  
  const totalAssets = completedInvestments.reduce((sum, i) => 
    sum + calculateTargetReturn(i.amount, i.pool), 0
  ) + activeInvestments.reduce((sum, i) => sum + i.amount, 0)
  
  const pendingReturns = activeCycles
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.targetValue - c.currentValue), 0)
  
  const totalProfit = completedInvestments.reduce((sum, i) => 
    sum + (calculateTargetReturn(i.amount, i.pool) - i.amount), 0
  )
  
  return {
    totalAssets: Math.round(totalAssets * 100) / 100,
    yesterdayPnl: 0,
    pendingReturns: Math.round(pendingReturns * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    activeCycles,
  }
}

export function generateChartData(investment: Investment, days: number = 10): { day: number; value: number }[] {
  const config = POOLS[investment.pool]
  const targetValue = calculateTargetReturn(investment.amount, investment.pool)
  const fluctuations = generateMarketFluctuations(days, targetValue, investment.amount)
  
  return fluctuations.map((value, i) => ({
    day: i + 1,
    value,
  }))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}