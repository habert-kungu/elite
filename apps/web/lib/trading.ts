/**
 * Investment plans.
 *
 * Four live plans, each with a fixed payout table ("invest X → earn Y"). The
 * payout for any amount inside a plan's range is interpolated linearly
 * between the two nearest tiers, so the advertised tiers are exact and
 * in-between amounts are fair. The Premium plan is denominated in BTC; the
 * other three in USD (USDT).
 *
 * Stored on an Investment as `pool` (plan key), `amount` (in the plan's
 * currency), `currency` and `roi` (= earn ÷ invest at the time of deposit,
 * so target = amount × roi stays consistent everywhere).
 */

export type PlanKey = 'daily' | 'pro5' | 'plan8' | 'premium12' | 'weekly'
/** @deprecated alias kept for existing imports */
export type PoolType = PlanKey

export type PlanCurrency = 'USD' | 'BTC'

export interface PlanTier {
  invest: number
  earn: number
}

export interface PlanConfig {
  key: PlanKey
  name: string
  shortName: string
  /** Marketing headline, e.g. "24 hours plan". */
  tagline: string
  durationDays: number
  currency: PlanCurrency
  tiers: PlanTier[]
  minInvest: number
  maxInvest: number
  /** Hidden from selection; still resolves for existing rows. */
  legacy?: boolean
  popular?: boolean
  /** @deprecated use calculateTargetReturn — kept for old callers */
  roiMultiplier: number
}

function plan(p: Omit<PlanConfig, 'minInvest' | 'maxInvest' | 'roiMultiplier'>): PlanConfig {
  const first = p.tiers[0]!
  const last = p.tiers[p.tiers.length - 1]!
  return { ...p, minInvest: first.invest, maxInvest: last.invest, roiMultiplier: first.earn / first.invest }
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  daily: plan({
    key: 'daily',
    name: 'Daily investment',
    shortName: 'Daily',
    tagline: '24 hours plan',
    durationDays: 1,
    currency: 'USD',
    tiers: [
      { invest: 300, earn: 3_000 },
      { invest: 400, earn: 4_000 },
      { invest: 500, earn: 5_000 },
      { invest: 600, earn: 6_000 },
      { invest: 700, earn: 7_000 },
      { invest: 800, earn: 8_000 },
      { invest: 900, earn: 9_000 },
    ],
  }),
  pro5: plan({
    key: 'pro5',
    name: 'Pro 5 days',
    shortName: 'Pro',
    tagline: '5 days plan',
    durationDays: 5,
    currency: 'USD',
    popular: true,
    tiers: [
      { invest: 1_000, earn: 15_000 },
      { invest: 2_000, earn: 30_000 },
      { invest: 3_000, earn: 45_000 },
      { invest: 4_000, earn: 60_000 },
      { invest: 5_000, earn: 75_000 },
    ],
  }),
  plan8: plan({
    key: 'plan8',
    name: '8 days plan',
    shortName: '8 days',
    tagline: '8 days plan',
    durationDays: 8,
    currency: 'USD',
    tiers: [
      { invest: 10_000, earn: 150_000 },
      { invest: 20_000, earn: 300_000 },
      { invest: 50_000, earn: 800_000 },
    ],
  }),
  premium12: plan({
    key: 'premium12',
    name: 'Premium 12 days',
    shortName: 'Premium',
    tagline: '12 days plan · BTC',
    durationDays: 12,
    currency: 'BTC',
    tiers: [
      { invest: 1, earn: 5 },
      { invest: 2, earn: 10 },
      { invest: 3, earn: 16 },
      { invest: 4, earn: 22 },
      { invest: 5, earn: 30 },
    ],
  }),
  // Legacy 7-day pool: kept so rows created before the plan change still
  // resolve to a duration/label. Not selectable.
  weekly: plan({
    key: 'weekly',
    name: 'Weekly pool',
    shortName: 'Weekly',
    tagline: '7 days plan',
    durationDays: 7,
    currency: 'USD',
    legacy: true,
    tiers: [
      { invest: 500, earn: 5_000 },
      { invest: 1_000_000, earn: 10_000_000 },
    ],
  }),
}

/** Plans a user can choose from, in display order. */
export const PLAN_KEYS: PlanKey[] = ['daily', 'pro5', 'plan8', 'premium12']
export const SELECTABLE_PLANS: PlanConfig[] = PLAN_KEYS.map((k) => PLANS[k])

/** @deprecated alias for PLANS */
export const POOLS = PLANS

export function isPlanKey(v: unknown): v is PlanKey {
  return typeof v === 'string' && v in PLANS
}

/** True for plans a new deposit may use (legacy keys excluded). */
export function isSelectablePlan(v: unknown): v is PlanKey {
  return isPlanKey(v) && !PLANS[v].legacy
}

export function planFor(key: string | null | undefined): PlanConfig {
  return isPlanKey(key) ? PLANS[key] : PLANS.weekly
}

/** Human label for a stored plan key. */
export function poolLabel(pool: string, short = false): string {
  const p = planFor(pool)
  return short ? p.shortName : p.name
}
export const planLabel = poolLabel

export function planCurrency(pool: string): PlanCurrency {
  return planFor(pool).currency
}

/** "$1,000" or "₿1.5" depending on the plan's currency. */
export function formatPlanAmount(amount: number, pool: string, digits?: number): string {
  const currency = planCurrency(pool)
  if (currency === 'BTC') {
    const frac = (amount.toString().split('.')[1] ?? '').length
    const d = digits ?? Math.min(8, frac)
    return `₿${amount.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 2) })}`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: digits ?? 0, maximumFractionDigits: digits ?? 0 })}`
}

/**
 * Payout for `amount` on `pool`: exact on a tier, linearly interpolated
 * between tiers, clamped to the plan's range. 0 for invalid input.
 */
export function calculateTargetReturn(amount: number, pool: PlanKey | string): number {
  const p = planFor(pool)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const tiers = p.tiers
  const a = Math.max(p.minInvest, Math.min(p.maxInvest, amount))
  for (let i = 0; i < tiers.length - 1; i++) {
    const lo = tiers[i]!
    const hi = tiers[i + 1]!
    if (a >= lo.invest && a <= hi.invest) {
      const t = (a - lo.invest) / (hi.invest - lo.invest || 1)
      const earn = lo.earn + (hi.earn - lo.earn) * t
      return p.currency === 'BTC' ? Math.round(earn * 1e6) / 1e6 : Math.round(earn * 100) / 100
    }
  }
  const last = tiers[tiers.length - 1]!
  return last.earn
}

/** Effective multiplier (earn ÷ invest) for an amount on a plan. */
export function calculateRoi(amount: number, pool: PlanKey | string): number {
  const earn = calculateTargetReturn(amount, pool)
  if (!earn || !amount) return planFor(pool).roiMultiplier
  return Math.round((earn / amount) * 1000) / 1000
}

/** Validation message for an amount on a plan, or null when acceptable. */
export function validatePlanAmount(amount: number, pool: PlanKey | string): string | null {
  const p = planFor(pool)
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount'
  if (amount < p.minInvest) return `Minimum for ${p.name} is ${formatPlanAmount(p.minInvest, pool)}`
  if (amount > p.maxInvest) return `Maximum for ${p.name} is ${formatPlanAmount(p.maxInvest, pool)}`
  return null
}

export const MIN_DEPOSIT_USD = PLANS.daily.minInvest
export const MAX_DEPOSIT_USD = PLANS.plan8.maxInvest

/**
 * Withholding tax on a withdrawal: 16.5%. It is **never** deducted from the
 * payout — the client settles it up front (a separate deposit) and then
 * receives the full amount they asked for.
 */
export const WITHDRAWAL_TAX_RATE = 0.165 // 16.5%

/**
 * Live position of a cycle. The stored `progress` is a baseline set at
 * `progressAt` (approval or the latest admin adjustment); an active cycle then
 * advances from that baseline with elapsed time over the plan's duration. So
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
  const days = planFor(pool).durationDays
  const since = new Date(cycle.progressAt ?? cycle.createdAt).getTime()
  const elapsed = Math.max(0, now - since)
  const timeProgress = Math.max(0, Math.min(100, (elapsed / (days * 24 * 60 * 60 * 1000)) * 100))
  const progress = Math.min(100, stored + timeProgress)
  const currentValue = cycle.startValue + (cycle.targetValue - cycle.startValue) * (progress / 100)
  const decimals = planCurrency(pool) === 'BTC' ? 1e6 : 100
  return {
    progress: Math.round(progress * 100) / 100,
    currentValue: Math.round(currentValue * decimals) / decimals,
    timeProgress: Math.round(timeProgress * 100) / 100,
  }
}

export interface WithdrawalCalculation {
  /** What the client asked to withdraw. */
  amount: number
  /** 16.5% tax, deposited by the client before the payout is released. */
  taxDue: number
  /** What actually reaches the wallet — the full amount, nothing withheld. */
  payout: number
}

/**
 * The tax a client must deposit before the given amount can be withdrawn.
 * Kept separate from the payout so it can never be netted off by accident.
 */
export function withdrawalTax(amount: number): number {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0
  return Math.round(safeAmount * WITHDRAWAL_TAX_RATE * 100) / 100
}

export function calculateWithdrawal(amount: number): WithdrawalCalculation {
  const safeAmount = Math.round((Number.isFinite(amount) && amount > 0 ? amount : 0) * 100) / 100
  return {
    amount: safeAmount,
    taxDue: withdrawalTax(safeAmount),
    payout: safeAmount,
  }
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
