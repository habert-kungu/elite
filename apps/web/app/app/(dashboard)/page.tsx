"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, ButtonLink, Card, EmptyState, Segmented, Skeleton } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { SELECTABLE_PLANS, formatPlanAmount, planCurrency, planFor, poolLabel } from "@/lib/trading"
import { IconArrowDownLeft, IconArrowUpRight, IconChartLine, IconChevronRight, IconClockHour4, IconMinus } from "@tabler/icons-react"

function money(n: number, digits = 0) {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** One cell of the account summary strip (Reports → summary row). */
function SummaryCell({ label, value, tone, hint }: { label: string; value: string; tone?: "success" | "danger"; hint?: React.ReactNode }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-foreground"
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <div className="text-[12px] leading-[18px] text-less">{label}</div>
      <div className={`mt-0.5 truncate text-[20px] font-bold leading-[30px] tabular-nums md:text-[24px] md:leading-9 ${color}`}>{value}</div>
      {hint && <div className="text-[12px] leading-[18px] text-less">{hint}</div>}
    </div>
  )
}

// Deterministic PRNG (mulberry32) — seeded so the walk is stable across
// re-renders (no flicker) but still varies by seed/timeframe.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Realistic "realized" price path (SmartCharts-style): a volatile random walk
// around an upward trend from start -> current. Mean-reverts toward the trend so
// it never drifts away, and always lands exactly on the current value.
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Synthetic "market" path from entry to the live value. Deterministic per
 * cycle + timeframe so it doesn't flicker between renders, but with real
 * volatility: multi-scale noise, momentum bursts and pullbacks below entry.
 */
function buildRealizedPath(startValue: number, currentValue: number, points: number = 48, targetValue?: number, seedKey = "cycle"): number[] {
  const n = Math.max(2, Math.floor(points))
  const gain = currentValue - startValue
  const level = Math.max(1, Math.abs(currentValue) || Math.abs(startValue) || 1)
  const span = Math.max(1, (targetValue ?? currentValue) - startValue)
  const progressFrac = Math.max(0, Math.min(1, gain / span))
  // Per-tick volatility: ~1.4% of price level at entry, rising to ~3.5% late in the cycle.
  const tickVol = level * (0.014 + 0.021 * progressFrac)
  const rand = mulberry32(hashSeed(`${seedKey}:${n}`))
  const data: number[] = []
  let walk = 0
  let momentum = 0

  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      data.push(Math.round(currentValue * 100) / 100)
      continue
    }
    const t = i / (n - 1)
    const trend = startValue + gain * (1 - Math.pow(1 - t, 1.4))
    // Momentum gives runs of several candles in one direction (bursts + pullbacks).
    momentum = momentum * 0.72 + (rand() - 0.5) * tickVol * 1.6
    // Fast jitter + slow swell so the line has texture at every zoom level.
    const jitter = (rand() - 0.5) * tickVol
    const swell = Math.sin(t * Math.PI * (2 + (rand() < 0.02 ? 1 : 0)) + walk * 0.001) * tickVol * 0.9
    walk = (walk + momentum + jitter) * 0.93
    // Pullbacks can dip up to ~7% below entry, but never below that.
    const v = Math.max(startValue * 0.93, trend + walk + swell)
    data.push(Math.round(v * 100) / 100)
  }

  return data
}

const TIME_PERIODS = [
  { label: '1m', value: 1 },
  { label: '5m', value: 5 },
  { label: '15m', value: 15 },
  { label: '1H', value: 60 },
  { label: '4H', value: 240 },
]

// Live tick cadence per timeframe (ms). Shorter views tick faster, like a
// 1-minute chart versus a 4-hour one.
const TICK_MS_BY_PERIOD: Record<number, number> = {
  1: 600,
  5: 800,
  15: 1000,
  60: 1300,
  240: 1800,
}

// Share of the cycle's total move that each timeframe's window looks back
// over: a 1m chart shows the last sliver of history, 4H shows it all.
const LOOKBACK_BY_PERIOD: Record<number, number> = {
  1: 0.03,
  5: 0.08,
  15: 0.2,
  60: 0.5,
  240: 1,
}

// How many points to render per selected timeframe (denser = longer range).
const POINTS_BY_PERIOD: Record<number, number> = {
  1: 24,
  5: 36,
  15: 48,
  60: 60,
  240: 96,
}

interface UserStats {
  totalAssets: number
  totalInvested: number
  totalProfit: number
  pendingReturns: number
  /** Total staked on BTC-denominated plans; excluded from the USD totals. */
  btcInvested?: number
  activeCycles: {
    id: string
    pool: string
    planName?: string
    currency?: "USD" | "BTC"
    durationDays?: number
    roi?: number
    startValue: number
    currentValue: number
    targetValue: number
    progress: number
    status: string
  }[]
  recentTransactions: {
    id: string
    type: string
    amount: number
    status: string
    createdAt: string
  }[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  // Cached: instant on return visits, refreshed in the background.
  const { data: stats, loading, refresh } = useCachedFetch<UserStats>(user ? "/api/user/stats" : null, { ttl: 60_000 })

  // Cycles advance with time on the server; poll so the chart keeps moving
  // while the page is open (Pusher events also trigger a refresh).
  React.useEffect(() => {
    if (!user) return
    const id = setInterval(() => void refresh(), 60_000)
    return () => clearInterval(id)
  }, [user, refresh])
  const [timePeriod, setTimePeriod] = React.useState(60)
  const [hoveredPoint, setHoveredPoint] = React.useState<{x: number; y: number; value: number; time: string} | null>(null)

  const [selectedCycleId, setSelectedCycleId] = React.useState<string | null>(null)
  const activeCycles = React.useMemo(() => stats?.activeCycles ?? [], [stats])
  const activeCycle = activeCycles.find((c) => c.id === selectedCycleId) ?? activeCycles[0]

  const hasActiveCycle = !!activeCycle
  // Cycle values follow the plan's currency: USD plans keep "$1,234", the
  // BTC plan renders "₿1.2345".
  const cyclePool = activeCycle?.pool ?? "daily"
  const isBtcCycle = (activeCycle?.currency ?? planCurrency(cyclePool)) === "BTC"
  /** Cycle amount with its currency symbol. */
  const cv = (n: number, digits = 0) => (isBtcCycle ? formatPlanAmount(n, cyclePool, 4) : `$${money(n, digits)}`)
  /** Same, without a symbol for USD (chart pills/axis). */
  const cvNum = (n: number, digits = 0) => (isBtcCycle ? formatPlanAmount(n, cyclePool, 4) : money(n, digits))

  // Number of points rendered depends on the selected timeframe.
  const pointsForPeriod = POINTS_BY_PERIOD[timePeriod] ?? 48

  const startValue = activeCycle?.startValue ?? 0
  const targetValue = activeCycle?.targetValue ?? 0
  const serverValue = activeCycle?.currentValue || activeCycle?.startValue || 0
  const progress = Math.min(100, Math.max(0, activeCycle?.progress || 0))

  // ---- Live ticking chart ------------------------------------------------
  // History is seeded from the synthetic path, then a new tick is appended
  // every TICK_MS (sliding window) so the chart moves continuously like a
  // live price feed. Ticks wander around an "anchor" that drifts along the
  // cycle's time-based progression between server refreshes.
  const [chartData, setChartData] = React.useState<number[]>([])
  const [liveValue, setLiveValue] = React.useState(0)
  const fetchedAtRef = React.useRef(Date.now())
  const walkRef = React.useRef({ walk: 0, momentum: 0 })
  const cycleKey = `${activeCycle?.id ?? "none"}:${timePeriod}`

  // Server refresh: re-anchor the clock (don't reset the history).
  React.useEffect(() => {
    fetchedAtRef.current = Date.now()
  }, [serverValue, progress])

  // New cycle or timeframe: rebuild history.
  React.useEffect(() => {
    if (!hasActiveCycle) {
      setChartData([])
      setLiveValue(0)
      return
    }
    // Short timeframes start their history near the current price (recent
    // window); long ones start at entry.
    const lookback = LOOKBACK_BY_PERIOD[timePeriod] ?? 1
    const windowStart = serverValue - (serverValue - startValue) * lookback
    const seed = buildRealizedPath(windowStart, serverValue, pointsForPeriod, targetValue, cycleKey)
    setChartData(seed)
    setLiveValue(seed[seed.length - 1] ?? serverValue)
    walkRef.current = { walk: 0, momentum: 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveCycle, cycleKey, pointsForPeriod, timePeriod])

  React.useEffect(() => {
    if (!hasActiveCycle || !activeCycle) return
    const durationMs = (activeCycle.durationDays ?? planFor(activeCycle.pool).durationDays) * 24 * 60 * 60 * 1000
    const ratePerMs = 100 / durationMs
    const tickMs = TICK_MS_BY_PERIOD[timePeriod] ?? 1000
    const id = setInterval(() => {
      const elapsed = Date.now() - fetchedAtRef.current
      const liveProgress = Math.min(100, progress + elapsed * ratePerMs)
      const anchor = startValue + (targetValue - startValue) * (liveProgress / 100)
      const level = Math.max(1, anchor)
      // Per-tick volatility ~0.7% of price, up to ~1.5% as the cycle matures,
      // with occasional spikes so the feed has real punch.
      const vol = level * (0.007 + 0.008 * (liveProgress / 100))
      const spike = Math.random() < 0.08 ? (Math.random() - 0.5) * vol * 4 : 0
      const st = walkRef.current
      st.momentum = st.momentum * 0.82 + (Math.random() - 0.5) * vol * 1.8 + spike
      st.walk = (st.walk + st.momentum + (Math.random() - 0.5) * vol) * 0.97
      const next = Math.round(Math.max(startValue * 0.93, Math.min(targetValue, anchor + st.walk)) * 100) / 100
      setChartData((prev) => (prev.length ? [...prev.slice(1), next] : prev))
      setLiveValue(next)
    }, tickMs)
    return () => clearInterval(id)
  }, [hasActiveCycle, activeCycle, timePeriod, progress, startValue, targetValue])

  const currentDisplayValue = liveValue || serverValue
  const prevValueRef = React.useRef(currentDisplayValue)
  const tickUp = currentDisplayValue >= prevValueRef.current
  React.useEffect(() => {
    prevValueRef.current = currentDisplayValue
  }, [currentDisplayValue])

  // Y-domain auto-scales to the VISIBLE ticks (like Deriv), not to entry or
  // target — once price has moved away from entry, the window follows the
  // action so every tick fills vertical space. A small floor (±1.5% of price)
  // keeps a brand-new, barely-moved cycle from looking like a seismograph.
  const domainSeries = chartData.length > 0 ? chartData : [currentDisplayValue || startValue]
  const level = Math.max(1, currentDisplayValue || startValue)
  const seriesMin = Math.min(...domainSeries)
  const seriesMax = Math.max(...domainSeries)
  const mid = (seriesMin + seriesMax) / 2
  const halfSpan = Math.max((seriesMax - seriesMin) / 2, level * 0.015)
  const minValue = mid - halfSpan * 1.25
  const maxValue = mid + halfSpan * 1.25
  const valueRange = maxValue - minValue || 1
  const entryInView = startValue >= minValue && startValue <= maxValue

  // Chart coordinate space is 0..300 wide, 0..200 tall.
  const yFor = (v: number) => 200 - ((v - minValue) / valueRange) * 180
  // Ticks fill the full width like a live price feed; "now" is the right edge.
  const progressX = 300
  const xForIndex = (i: number) =>
    chartData.length > 1 ? (i / (chartData.length - 1)) * progressX : 0
  // Percentage positions for HTML overlays (undistorted by the stretched SVG).
  const currentTopPct = (yFor(currentDisplayValue) / 200) * 100
  const entryTopPct = (yFor(startValue) / 200) * 100


  // Line colour follows the position: teal while above entry, coral below.
  const inProfit = currentDisplayValue >= startValue
  const lineColor = inProfit ? "var(--chart-up)" : "var(--chart-down)"
  const profitAbs = Math.abs(Math.round(currentDisplayValue - startValue))
  const roi = activeCycle ? activeCycle.roi ?? Math.round((activeCycle.targetValue / (activeCycle.startValue || 1)) * 10) / 10 : 0
  const firstName = user?.name?.split(" ")[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-[16px]" />
        <Skeleton className="h-[420px] w-full rounded-[16px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Overview"}
        description="Your portfolio, open cycle and recent activity at a glance."
        actions={
          <>
            <ButtonLink href="/app/withdraw" variant="secondary" size="sm" className="hidden sm:inline-flex">
              Withdraw
            </ButtonLink>
            <ButtonLink href="/app/investments" size="sm">
              Trade
            </ButtonLink>
          </>
        }
      />

      {/* Account summary strip */}
      <Card className="grid grid-cols-2 divide-y divide-[var(--background-hover)] sm:divide-y-0 sm:divide-x lg:grid-cols-4 animate-fade-up">
        <SummaryCell label="Total assets" value={`$${money(stats?.totalAssets || 0, 2)}`} hint="USD" />
        <SummaryCell
          label="Invested"
          value={`$${money(stats?.totalInvested || 0)}`}
          hint={
            <>
              {`${activeCycles.length} open cycle${activeCycles.length === 1 ? "" : "s"}`}
              {(stats?.btcInvested || 0) > 0 && (
                <span className="block text-brand">+ {formatPlanAmount(stats?.btcInvested || 0, "premium12")} in Premium</span>
              )}
            </>
          }
        />
        <SummaryCell label="Pending returns" value={`$${money(stats?.pendingReturns || 0)}`} hint="Paid at cycle end" />
        <SummaryCell label="Total profit" value={`${(stats?.totalProfit || 0) >= 0 ? "+" : "-"}$${money(Math.abs(stats?.totalProfit || 0))}`} tone={(stats?.totalProfit || 0) >= 0 ? "success" : "danger"} hint="All time" />
      </Card>

      {/* Trading panel: open cycle + live chart */}
      <Card className="overflow-hidden animate-fade-up" style={{ animationDelay: "80ms" }}>
        {/* Cycle tabs (bordered tabs) when more than one is open */}
        {activeCycles.length > 1 && (
          <div role="tablist" className="tabs overflow-x-auto px-2">
            {activeCycles.map((c) => (
              <button key={c.id} role="tab" type="button" aria-selected={c.id === activeCycle?.id} className="tab" onClick={() => setSelectedCycleId(c.id)}>
                {c.planName ?? poolLabel(c.pool, true)} · {formatPlanAmount(c.startValue, c.pool, planCurrency(c.pool) === "BTC" ? 4 : 0)}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {activeCycle ? (
                <>
                  <Badge tone="success" dot>Open</Badge>
                  <Badge tone="neutral">{activeCycle.planName ?? poolLabel(activeCycle.pool)}</Badge>
                  <Badge tone="brand">{roi}x target</Badge>
                </>
              ) : (
                <Badge tone="neutral">No open position</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-[28px] font-bold leading-[34px] tabular-nums text-foreground md:text-[32px] md:leading-10">
                {activeCycle ? cv(currentDisplayValue, 2) : "$0.00"}
              </div>
              {activeCycle && (
                <div className={`text-[14px] font-bold tabular-nums ${inProfit ? "text-success" : "text-destructive"}`}>
                  {inProfit ? "+" : "-"}{cv(profitAbs)} ({startValue ? `${inProfit ? "+" : "-"}${Math.abs(((currentDisplayValue - startValue) / startValue) * 100).toFixed(1)}%` : "0%"})
                </div>
              )}
            </div>
            <div className="mt-0.5 text-[12px] leading-[18px] text-less">
              {activeCycle ? `Entry ${cv(startValue)} · Payout ${cv(activeCycle.targetValue)}` : "Open a cycle to start tracking live value."}
            </div>
          </div>
          <Segmented items={TIME_PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={timePeriod} onChange={setTimePeriod} className="self-start" />
        </div>

        {/* Chart Area */}
        <div className="relative mx-4 h-56 sm:mx-6 sm:h-72">
          {!hasActiveCycle ? (
            <EmptyState
              className="h-full py-0"
              icon={<IconChartLine className="h-6 w-6" stroke={1.8} />}
              title="No open cycle"
              description="Start a plan and your live position will chart here."
              action={<ButtonLink href="/app/investments" size="sm">Start trading</ButtonLink>}
            />
          ) : (
            <>
              {hoveredPoint && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[4px] bg-foreground px-2 py-1 text-[12px] font-bold tabular-nums text-background"
                  style={{ left: `${Math.min(88, Math.max(12, hoveredPoint.x))}%`, top: `calc(${hoveredPoint.y}% - 32px)` }}
                >
                  ${hoveredPoint.value.toLocaleString()} · {hoveredPoint.time}
                </div>
              )}

              <svg className="h-full w-full" viewBox="0 0 300 200" preserveAspectRatio="none" onMouseLeave={() => setHoveredPoint(null)}>
                {[40, 80, 120, 160].map((y) => (
                  <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="var(--chart-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}
                <defs>
                  <linearGradient id="tvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                  </linearGradient>
                  <clipPath id="chartReveal">
                    <rect key={`reveal-${timePeriod}-${activeCycle?.id}`} className="chart-reveal" x="0" y="0" width="300" height="200" />
                  </clipPath>
                </defs>

                {entryInView && (
                  <line x1="0" y1={yFor(startValue)} x2="300" y2={yFor(startValue)} stroke="var(--foreground-tertiary)" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="3,4" vectorEffect="non-scaling-stroke" />
                )}

                <g clipPath="url(#chartReveal)">
                  {chartData.length > 0 && (
                    <path
                      d={`M 0 200 ${chartData.map((d, i) => `L ${xForIndex(i).toFixed(2)} ${yFor(d).toFixed(2)}`).join(" ")} L ${progressX.toFixed(2)} 200 Z`}
                      fill="url(#tvAreaGrad)"
                    />
                  )}
                  {chartData.length > 0 && (
                    <path
                      key={`line-${timePeriod}-${activeCycle?.id}`}
                      d={chartData.map((d, i) => `${i === 0 ? "M" : "L"} ${xForIndex(i).toFixed(2)} ${yFor(d).toFixed(2)}`).join(" ")}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>

                {chartData.map((d, i) => {
                  const x = xForIndex(i)
                  const y = yFor(d)
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="10"
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          x: (x / 300) * 100,
                          y: (y / 200) * 100,
                          value: d,
                          time: `${Math.round((i / Math.max(1, chartData.length - 1)) * progress)}%`,
                        })
                      }
                    />
                  )
                })}
              </svg>

              {/* Live marker */}
              <div className="pointer-events-none absolute right-0 -translate-y-1/2 translate-x-1/2" style={{ top: `${currentTopPct}%`, transition: "top 300ms ease-out" }}>
                <span className="absolute inset-0 -m-1.5 animate-ping rounded-full opacity-40" style={{ backgroundColor: lineColor }} />
                <span className="relative block h-2.5 w-2.5 rounded-full ring-2 ring-[var(--background-secondary)]" style={{ backgroundColor: lineColor }} />
              </div>

              {/* Right-edge price pill */}
              <div
                className={`pointer-events-none absolute right-0 -translate-y-1/2 rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white ${tickUp ? "bg-success" : "bg-destructive"}`}
                style={{ top: `${currentTopPct}%`, transition: "top 300ms ease-out, background-color 200ms" }}
              >
                {cvNum(currentDisplayValue, 2)}
              </div>

              {/* Entry tag */}
              <div
                className="pointer-events-none absolute left-0 -translate-y-1/2 rounded-[2px] bg-[var(--background-active)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground"
                style={{ top: entryInView ? `${entryTopPct}%` : "calc(100% - 10px)" }}
              >
                Entry {cvNum(startValue)}{entryInView ? "" : " ↓"}
              </div>

              <div className="pointer-events-none absolute left-0 top-0 rounded-[2px] px-1 text-[10px] tabular-nums text-less">
                {cvNum(maxValue)}
              </div>
            </>
          )}
        </div>

        {/* Cycle progress + summary */}
        {activeCycle && (
          <div className="mx-4 mt-4 border-t-2 border-[var(--background-hover)] pt-4 pb-4 sm:mx-6 sm:pb-6">
            <div className="mb-4 flex items-center justify-between text-[12px] leading-[18px] text-less">
              <span>Cycle progress</span>
              <span className="font-bold text-foreground">{Math.round(activeCycle.progress)}%</span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-[var(--background-active)]">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(activeCycle.progress, 100)}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div>
                <div className="text-[12px] leading-[18px] text-less">Entry</div>
                <div className="text-[16px] font-bold leading-6 tabular-nums text-foreground">{cv(startValue)}</div>
              </div>
              <div>
                <div className="text-[12px] leading-[18px] text-less">Profit</div>
                <div className={`text-[16px] font-bold leading-6 tabular-nums ${inProfit ? "text-success" : "text-destructive"}`}>{inProfit ? "+" : "-"}{cv(profitAbs)}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] leading-[18px] text-less">Payout</div>
                <div className="text-[16px] font-bold leading-6 tabular-nums text-foreground">{cv(activeCycle.targetValue)}</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Secondary row */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Plans */}
        <Card className="p-5 animate-fade-up" style={{ animationDelay: "140ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold leading-6 text-foreground">Plans</h3>
            <Link href="/app/investments" className="text-[12px] font-bold text-brand hover:underline">Compare</Link>
          </div>
          <div className="space-y-2">
            {SELECTABLE_PLANS.map((p) => {
              const first = p.tiers[0]!
              return (
                <Link key={p.key} href="/app/investments" className="group flex items-center gap-3 rounded-[8px] bg-background p-3 transition-colors hover:bg-hover">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <IconClockHour4 className="h-4 w-4" stroke={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold text-foreground">{p.name}</span>
                      {p.popular && <Badge tone="brand">Popular</Badge>}
                    </div>
                    <div className="text-[12px] leading-[18px] text-less">{p.tagline}</div>
                    <div className="text-[12px] leading-[18px] tabular-nums text-brand">
                      from {formatPlanAmount(first.invest, p.key)} → {formatPlanAmount(first.earn, p.key)}
                    </div>
                  </div>
                  <IconChevronRight className="h-4 w-4 flex-shrink-0 text-less transition-transform group-hover:translate-x-0.5" stroke={2} />
                </Link>
              )
            })}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold leading-6 text-foreground">Recent activity</h3>
            <Link href="/app/transactions" className="text-[12px] font-bold text-brand hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[var(--background-hover)]">
            {stats?.recentTransactions?.slice(0, 5).map((tx) => {
              const inflow = tx.type === "deposit" || tx.type === "return"
              const outflow = tx.type === "withdrawal"
              const Glyph = inflow ? IconArrowDownLeft : outflow ? IconArrowUpRight : IconMinus
              const wrap = inflow ? "bg-success-soft text-success" : outflow ? "bg-danger-soft text-destructive" : "bg-hover text-less"
              const amountColor = inflow ? "text-success" : outflow ? "text-destructive" : "text-foreground"
              const sign = inflow ? "+" : outflow ? "-" : ""
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${wrap}`}>
                    <Glyph className="h-4 w-4" stroke={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] capitalize text-foreground">{tx.type}</div>
                    <div className="text-[12px] leading-[18px] text-less">{new Date(tx.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
                  </div>
                  <span className={`text-[14px] font-bold tabular-nums ${amountColor}`}>{sign}${money(tx.amount)}</span>
                </div>
              )
            })}
            {(!stats?.recentTransactions || stats.recentTransactions.length === 0) && (
              <p className="py-6 text-center text-[12px] text-less">No transactions yet</p>
            )}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-5 animate-fade-up md:col-span-2 xl:col-span-1" style={{ animationDelay: "260ms" }}>
          <h3 className="mb-4 text-[16px] font-bold leading-6 text-foreground">Quick actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink href="/app/investments" block>Deposit</ButtonLink>
            <ButtonLink href="/app/withdraw" variant="secondary" block>Withdraw</ButtonLink>
            <ButtonLink href="/app/explore" variant="tertiary" block>Markets</ButtonLink>
            <ButtonLink href="/app/support" variant="tertiary" block>Help centre</ButtonLink>
          </div>
          <p className="mt-4 text-[12px] leading-[18px] text-less">
            Deposits are credited once confirmed. Withdrawals are reviewed within 24 hours.
          </p>
        </Card>
      </div>
    </div>
  )
}
