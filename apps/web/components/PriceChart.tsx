"use client"

import * as React from "react"

/**
 * Theme-aware, dependency-free area chart used by the crypto (Binance) and
 * forex (Frankfurter) market views. Pure presentation: callers supply points.
 */

export type PricePoint = { t: number; v: number }

export function fmtPrice(n: number, digits?: number) {
  const d = digits ?? (n < 1 ? 4 : n < 10 ? 4 : 2)
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function PriceChart({
  points,
  loading,
  error,
  timeframes,
  timeframe,
  onTimeframe,
  formatTime,
  digits,
  prefix = "$",
  height = 260,
  id,
}: {
  points: PricePoint[]
  loading: boolean
  error: boolean
  timeframes: string[]
  timeframe: string
  onTimeframe: (tf: string) => void
  formatTime: (t: number) => string
  digits?: number
  prefix?: string
  height?: number
  id: string
}) {
  const [hover, setHover] = React.useState<number | null>(null)

  const W = 600
  const H = 200
  const PAD = { l: 0, r: 60, t: 12, b: 20 }
  const lo = points.length ? Math.min(...points.map((p) => p.v)) : 0
  const hi = points.length ? Math.max(...points.map((p) => p.v)) : 1
  const range = hi - lo || 1
  const x = (i: number) => PAD.l + (i / Math.max(1, points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / range) * (H - PAD.t - PAD.b)

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")
  const area = points.length ? `${path} L${x(points.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z` : ""
  const first = points[0]?.v ?? 0
  const last = points[points.length - 1]?.v ?? 0
  const up = last >= first
  const color = up ? "var(--color-success)" : "var(--destructive)"
  const change = first ? ((last - first) / first) * 100 : 0
  const hovered = hover !== null ? points[hover] : null
  const ticks = [hi, lo + range * 0.5, lo]

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  return (
    <div className="relative bg-card" style={{ height }}>
      <div className="absolute left-2 top-2 z-10 flex gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframe(tf)}
            className={`rounded px-2 py-1 text-[9px] font-medium transition-all sm:text-[10px] ${timeframe === tf ? "bg-foreground text-background" : "bg-secondary/80 text-muted-foreground hover:text-foreground"}`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="absolute right-3 top-2 z-10 text-right">
        <div className="font-mono text-sm font-medium tabular-nums text-foreground">
          {prefix}
          {fmtPrice(hovered ? hovered.v : last, digits)}
        </div>
        <div className="text-[10px] font-medium tabular-nums" style={{ color }}>
          {hovered ? formatTime(hovered.t) : `${change >= 0 ? "+" : ""}${change.toFixed(2)}% · ${timeframe}`}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <span className="text-[10px] text-muted-foreground">Loading chart…</span>
          </div>
        </div>
      )}
      {!loading && (error || points.length === 0) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-muted-foreground">Chart unavailable right now</div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[calc(100%-44px)] w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-border" strokeDasharray="3 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={W - PAD.r + 6} y={y(v) + 3} className="fill-muted-foreground" fontSize="9" fontFamily="var(--font-mono)">
              {fmtPrice(v, digits)}
            </text>
          </g>
        ))}
        {area && <path d={area} fill={`url(#fill-${id})`} />}
        {path && <path d={path} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
        {hovered && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" className="text-muted-foreground/60" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(hovered.v)} r="3.5" fill={color} vectorEffect="non-scaling-stroke" />
          </g>
        )}
        {points.length > 0 && (
          <>
            <text x={PAD.l + 4} y={H - 6} className="fill-muted-foreground" fontSize="9">{formatTime(points[0]!.t)}</text>
            <text x={W - PAD.r - 4} y={H - 6} textAnchor="end" className="fill-muted-foreground" fontSize="9">{formatTime(points[points.length - 1]!.t)}</text>
          </>
        )}
      </svg>
    </div>
  )
}
