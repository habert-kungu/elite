"use client"


import { Card } from "@/components/ui"
import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch } from "@/lib/use-cached-fetch"

function StatCard({ label, value, icon, change, positive, index = 0 }: { label: string; value: string; icon: string; change?: string; positive?: boolean; index?: number }) {
  return (
    <Card className="p-3 sm:p-5 animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {icon === "wallet" && <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>}
            {icon === "trending" && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}
            {icon === "clock" && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
            {icon === "chart" && <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>}
          </svg>
        </div>
        {change && (
          <span className={`text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${positive ? 'bg-[var(--bg-success)] text-[var(--color-success)]' : 'bg-[var(--bg-danger)] text-[var(--destructive)]'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-[11px] sm:text-[12px] text-muted-foreground mb-1 font-medium">{label}</div>
      <div className="text-lg sm:text-xl font-medium tabular-nums text-foreground">{value}</div>
    </Card>
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
  activeCycles: {
    id: string
    pool: string
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
    const durationMs = (activeCycle.pool === "daily" ? 2 : 7) * 24 * 60 * 60 * 1000
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

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">Here's your portfolio overview.</p>
        </div>
        <Link
          href="/app/investments"
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-[var(--color-success)] px-3 py-2 text-xs font-medium text-white transition-all hover:opacity-90 sm:text-sm"
        >
          + Invest
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard 
          label="Total Assets" index={0} 
          value={`$${(stats?.totalAssets || 0).toLocaleString()}`} 
          icon="wallet" 
        />
        <StatCard 
          label="Invested" index={1} 
          value={`$${(stats?.totalInvested || 0).toLocaleString()}`} 
          icon="trending" 
        />
        <StatCard 
          label="Pending Returns" index={2} 
          value={`$${(stats?.pendingReturns || 0).toLocaleString()}`} 
          icon="clock" 
        />
        <StatCard 
          label="Total Profit" index={3} 
          value={`$${(stats?.totalProfit || 0).toLocaleString()}`} 
          icon="chart" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Cycle */}
          {activeCycles.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {activeCycles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCycleId(c.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    c.id === activeCycle?.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.pool === 'daily' ? '48H' : 'Weekly'} · ${Math.round(c.startValue).toLocaleString()} · {Math.round(c.progress)}%
                </button>
              ))}
            </div>
          )}
          {activeCycle && (
            <Card className="p-4 sm:p-6 overflow-hidden relative animate-fade-up" style={{ animationDelay: "120ms" }}>
              <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.62_0.12_178)/5] via-transparent to-[oklch(0.62_0.12_178)/10]" />
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[oklch(0.62_0.12_178)/15] text-[oklch(0.62_0.12_178)] rounded-full text-[10px] sm:text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-[oklch(0.62_0.12_178)] rounded-full animate-pulse" />
                        Active
                      </span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {activeCycle.pool === 'daily' ? '48H Pool' : 'Weekly Pool'}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">Cycle Progress</h2>
                  </div>
                  <div className="text-right sm:ml-4">
                    <div className="text-2xl sm:text-3xl font-medium tabular-nums text-foreground">${Math.round(currentDisplayValue).toLocaleString()}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">of ${Math.round(activeCycle.targetValue).toLocaleString()}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="h-2 bg-[oklch(0.62_0.12_178)/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[oklch(0.62_0.12_178)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(activeCycle.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
                    <span>Started</span>
                    <span>{Math.round(activeCycle.progress)}% Complete</span>
                    <span>Target</span>
                  </div>
                </div>

                {/* Start New Investment */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    ROI: <span className="text-[oklch(0.62_0.12_178)] font-medium">{activeCycle.roi ?? Math.round((activeCycle.targetValue / (activeCycle.startValue || 1)) * 10) / 10}x</span>
                  </div>
                  <Link 
                    href="/app/investments"
                    className="flex items-center gap-2 px-4 py-2 bg-[oklch(0.62_0.12_178)] text-white rounded-lg text-xs font-medium hover:opacity-90 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Start Investing
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Chart - TradingView Style */}
          <Card className="p-4 sm:p-6 overflow-hidden animate-fade-up" style={{ animationDelay: "180ms" }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">Portfolio Chart</h3>
                <span className="text-[10px] px-2 py-0.5 bg-[oklch(0.62_0.12_178)/12] text-[oklch(0.62_0.12_178)] rounded font-mono">USDT</span>
              </div>
              
              {/* Time Period Selector */}
              <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
                {TIME_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setTimePeriod(period.value)}
                    className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-mono rounded transition-all ${
                      timePeriod === period.value
                        ? 'bg-[oklch(0.62_0.12_178)] text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chart Area */}
            <div className="relative h-48 sm:h-64">
              {!hasActiveCycle ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3v18h18"/>
                      <path d="M18 9l-5 5-4-4-3 3"/>
                    </svg>
                    <p className="text-sm text-muted-foreground">No active investment</p>
                    <Link href="/app/investments" className="text-xs text-[oklch(0.62_0.12_178)] hover:underline mt-1 inline-block">
                      Start investing →
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Crosshair tooltip */}
                  {hoveredPoint && (
                    <div
                      className="pointer-events-none absolute z-10 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[10px] text-background sm:text-xs"
                      style={{ left: `${Math.min(88, Math.max(12, hoveredPoint.x))}%`, top: `calc(${hoveredPoint.y}% - 30px)` }}
                    >
                      ${hoveredPoint.value.toLocaleString()} · {hoveredPoint.time}
                    </div>
                  )}
                  
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 300 200"
                    preserveAspectRatio="none"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Grid lines */}
                    {[40, 80, 120, 160].map((y) => (
                      <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="var(--chart-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}

                    <defs>
                      <linearGradient id="tvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity="0" />
                      </linearGradient>
                      {/* Left-to-right reveal of line + fill (width animates 0 → 300). */}
                      <clipPath id="chartReveal">
                        <rect key={`reveal-${timePeriod}-${activeCycle?.id}`} className="chart-reveal" x="0" y="0" width="300" height="200" />
                      </clipPath>
                    </defs>

                    {/* Entry reference line (horizontal at the start value) */}
                    {entryInView && (
                      <line x1="0" y1={yFor(startValue)} x2="300" y2={yFor(startValue)} stroke="var(--chart-grid)" strokeWidth="1" strokeDasharray="3,4" vectorEffect="non-scaling-stroke" />
                    )}

                    <g clipPath="url(#chartReveal)">
                    {/* Realized area fill (start -> now) */}
                    {chartData.length > 0 && (
                      <path
                        d={`M 0 200 ${chartData.map((d, i) => `L ${xForIndex(i).toFixed(2)} ${yFor(d).toFixed(2)}`).join(' ')} L ${progressX.toFixed(2)} 200 Z`}
                        fill="url(#tvAreaGrad)"
                      />
                    )}

                    {/* Realized ticking line (start -> now) */}
                    {chartData.length > 0 && (
                      <path
                        key={`line-${timePeriod}-${activeCycle?.id}`}
                        d={chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(2)} ${yFor(d).toFixed(2)}`).join(' ')}
                        fill="none"
                        stroke="var(--chart-accent)"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    </g>

                    {/* Interactive hover areas */}
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
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint({
                            x: (x / 300) * 100,
                            y: (y / 200) * 100,
                            value: d,
                            time: `${Math.round((i / Math.max(1, chartData.length - 1)) * progress)}%`,
                          })}
                        />
                      )
                    })}
                  </svg>

                  {/* Current price marker: pulsing dot at the right edge (HTML overlay) */}
                  <div className="pointer-events-none absolute right-0 -translate-y-1/2 translate-x-1/2" style={{ top: `${currentTopPct}%`, transition: "top 300ms ease-out" }}>
                    <span className="absolute inset-0 -m-1.5 animate-ping rounded-full bg-[var(--chart-accent)] opacity-40" />
                    <span className="relative block h-2.5 w-2.5 rounded-full bg-[var(--chart-accent)] ring-2 ring-card" />
                  </div>

                  {/* Deriv-style right-edge price pill at the live value */}
                  <div
                    className={`pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow-sm tabular-nums ${tickUp ? "bg-[var(--color-success)]" : "bg-[var(--destructive)]"}`}
                    style={{ top: `${currentTopPct}%`, transition: "top 300ms ease-out, background-color 200ms" }}
                  >
                    ${currentDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* Entry tag: on the reference line while in view, otherwise pinned bottom-left */}
                  <div
                    className="pointer-events-none absolute left-1 -translate-y-1/2 rounded bg-card/80 px-1 font-mono text-[9px] text-muted-foreground"
                    style={{ top: entryInView ? `${entryTopPct}%` : "calc(100% - 8px)" }}
                  >
                    Entry ${Math.round(startValue).toLocaleString()}{entryInView ? "" : " ↓"}
                  </div>

                  {/* Session high (Y-max) label, top-left */}
                  <div className="pointer-events-none absolute left-1 top-1 rounded bg-card/80 px-1 text-[10px] font-mono text-muted-foreground tabular-nums">
                    ${Math.round(maxValue).toLocaleString()}
                  </div>
                </>
              )}
            </div>
            
            {/* Chart Stats */}
            {activeCycle && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3 sm:gap-6">
                  <div>
                    <div className="text-[9px] sm:text-[10px] uppercase text-muted-foreground font-mono mb-0.5">Current</div>
                    <div className="text-base sm:text-xl font-medium tabular-nums text-foreground">${Math.round(currentDisplayValue).toLocaleString()}</div>
                  </div>
                  <div className="w-px h-6 sm:h-10 bg-border" />
                  <div>
                    <div className="text-[9px] sm:text-[10px] uppercase text-muted-foreground font-mono mb-0.5">Profit</div>
                    <div className={`text-base sm:text-xl font-medium tabular-nums ${currentDisplayValue >= activeCycle.startValue ? "text-[var(--color-success)]" : "text-destructive"}`}>{currentDisplayValue >= activeCycle.startValue ? "+" : "-"}${Math.abs(Math.round(currentDisplayValue - activeCycle.startValue)).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-[9px] sm:text-[10px] uppercase text-muted-foreground font-mono mb-0.5">Payout</div>
                  <div className="text-base sm:text-xl font-medium text-foreground">${Math.round(activeCycle.targetValue).toLocaleString()}</div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-3 sm:space-y-4">
          {/* Quick Actions */}
          <Card className="p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/app/investments" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-[oklch(0.62_0.12_178)] text-white hover:opacity-90 transition-all group">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium">Buy Crypto</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-auto opacity-60 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
              <Link href="/app/withdraw" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-border text-foreground hover:bg-secondary hover:border-[oklch(0.62_0.12_178)/30] transition-all group">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium">Withdraw</span>
                <span className="ml-auto text-[9px] sm:text-[10px] text-muted-foreground">16.5% fee</span>
              </Link>
            </div>
          </Card>

          {/* Pool Options */}
          <Card className="p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Pools</h3>
            <div className="space-y-2 sm:space-y-3">
              <Link href="/app/investments" className="block p-3 sm:p-4 rounded-lg border border-border hover:border-[oklch(0.62_0.12_178)/40] hover:bg-secondary/50 transition-all group">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium text-foreground">48H Pool</span>
                  <span className="text-[10px] sm:text-xs font-mono text-[oklch(0.62_0.12_178)]">10x</span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">48 hours · paid within 48h</p>
              </Link>
              <Link href="/app/investments" className="block p-3 sm:p-4 rounded-lg border-2 border-[oklch(0.62_0.12_178)/30 bg-[oklch(0.62_0.12_178)/5] hover:bg-[oklch(0.62_0.12_178)/10 transition-all group relative">
                <div className="absolute -top-2 right-2 text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 bg-[oklch(0.62_0.12_178)] text-white rounded">Popular</div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium text-foreground">Weekly Pool</span>
                  <span className="text-[10px] sm:text-xs font-mono text-[oklch(0.62_0.12_178)]">10x</span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">7 days duration</p>
              </Link>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Recent</h3>
              <Link href="/app/transactions" className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground">View All</Link>
            </div>
            <div className="space-y-3">
              {stats?.recentTransactions?.slice(0, 5).map((tx) => {
                const inflow = tx.type === 'deposit' || tx.type === 'return'
                const outflow = tx.type === 'withdrawal'
                const iconWrap = inflow
                  ? 'bg-[var(--bg-success)] text-[var(--color-success)]'
                  : outflow
                  ? 'bg-[var(--bg-danger)] text-destructive'
                  : 'bg-muted text-muted-foreground'
                const amountColor = inflow ? 'text-[var(--color-success)]' : outflow ? 'text-destructive' : 'text-foreground'
                const sign = inflow ? '+' : outflow ? '-' : ''
                return (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${iconWrap}`}>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {inflow
                            ? <polyline points="20 6 9 17 4 12" />
                            : outflow
                            ? <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" /></>
                            : <><line x1="5" y1="12" x2="19" y2="12" /></>}
                        </svg>
                      </div>
                      <div>
                        <div className="text-[11px] capitalize text-foreground sm:text-xs">{tx.type}</div>
                        <div className="text-[9px] text-muted-foreground sm:text-[10px]">{new Date(tx.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium sm:text-xs ${amountColor}`}>
                      {sign}${tx.amount.toLocaleString()}
                    </span>
                  </div>
                )
              })}
              {(!stats?.recentTransactions || stats.recentTransactions.length === 0) && (
                <p className="text-[11px] text-muted-foreground text-center py-4">No recent transactions</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}