"use client"

import * as React from "react"
import { Spinner } from "@/components/ui"

/**
 * Theme-aware, dependency-free area chart used by the crypto (Binance) and
 * forex (Frankfurter) market views. Pure presentation: callers supply points.
 *
 * The SVG is drawn in real pixels (the container is measured with a
 * ResizeObserver) so labels never stretch, whatever the viewport width.
 */

export type PricePoint = { t: number; v: number }

export function fmtPrice(n: number, digits?: number) {
  const d = digits ?? (n < 1 ? 4 : n < 10 ? 4 : 2)
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
}

function useSize<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
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
  const [plotRef, { w: W, h: H }] = useSize<HTMLDivElement>()

  const PAD = { l: 0, r: 64, t: 8, b: 22 }
  const lo = points.length ? Math.min(...points.map((p) => p.v)) : 0
  const hi = points.length ? Math.max(...points.map((p) => p.v)) : 1
  const range = hi - lo || 1
  const innerW = Math.max(1, W - PAD.l - PAD.r)
  const innerH = Math.max(1, H - PAD.t - PAD.b)
  const x = (i: number) => PAD.l + (i / Math.max(1, points.length - 1)) * innerW
  const y = (v: number) => PAD.t + (1 - (v - lo) / range) * innerH

  const path = W > 0 ? points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ") : ""
  const area = path ? `${path} L${x(points.length - 1).toFixed(1)},${(H - PAD.b).toFixed(1)} L${x(0).toFixed(1)},${(H - PAD.b).toFixed(1)} Z` : ""
  const first = points[0]?.v ?? 0
  const last = points[points.length - 1]?.v ?? 0
  const up = last >= first
  const color = up ? "var(--chart-up)" : "var(--chart-down)"
  const change = first ? ((last - first) / first) * 100 : 0
  const hovered = hover !== null ? points[hover] : null
  const ticks = [hi, lo + range * 0.5, lo]

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - PAD.l) / innerW) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Header row: timeframes + live value */}
      <div className="flex h-11 items-center justify-between gap-3 px-4">
        <div role="tablist" className="segment">
          {timeframes.map((tf) => (
            <button key={tf} role="tab" type="button" aria-selected={timeframe === tf} className="segment-item h-6 px-2 text-[11px]" onClick={() => onTimeframe(tf)}>
              {tf}
            </button>
          ))}
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate text-[14px] font-bold tabular-nums text-foreground">
            {prefix}
            {fmtPrice(hovered ? hovered.v : last, digits)}
          </div>
          <div className="text-[11px] font-medium tabular-nums" style={{ color }}>
            {hovered ? formatTime(hovered.t) : `${change >= 0 ? "+" : ""}${change.toFixed(2)}% · ${timeframe}`}
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--background-secondary)_80%,transparent)]">
          <div className="flex flex-col items-center gap-2 text-less">
            <Spinner className="h-6 w-6" />
            <span className="text-[12px] leading-[18px]">Loading chart…</span>
          </div>
        </div>
      )}
      {!loading && (error || points.length === 0) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-[12px] text-less">Chart unavailable right now</div>
      )}

      <div ref={plotRef} className="absolute inset-x-0 bottom-0 top-11 px-0">
        {W > 0 && H > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth="1" />
                <text x={W - PAD.r + 8} y={y(v) + 3.5} fill="var(--foreground-tertiary)" fontSize="10" fontFamily="var(--font-sans)">
                  {fmtPrice(v, digits)}
                </text>
              </g>
            ))}
            {area && <path d={area} fill={`url(#fill-${id})`} />}
            {path && <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />}
            {hovered && hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--foreground-tertiary)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(hovered.v)} r="3.5" fill={color} stroke="var(--background-secondary)" strokeWidth="2" />
              </g>
            )}
            {points.length > 0 && (
              <>
                <text x={PAD.l + 12} y={H - 7} fill="var(--foreground-tertiary)" fontSize="10" fontFamily="var(--font-sans)">{formatTime(points[0]!.t)}</text>
                <text x={W - PAD.r - 4} y={H - 7} textAnchor="end" fill="var(--foreground-tertiary)" fontSize="10" fontFamily="var(--font-sans)">{formatTime(points[points.length - 1]!.t)}</text>
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  )
}
