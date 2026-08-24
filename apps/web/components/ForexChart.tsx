"use client"

import * as React from "react"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { PriceChart, type PricePoint, fmtPrice } from "./PriceChart"

/**
 * Forex views backed by Frankfurter (ECB reference rates). Daily data, so the
 * timeframes are 1M–1Y. Cached in-session; a tiny fraction of the weight of
 * the TradingView embeds this replaces.
 */

const API = "https://api.frankfurter.dev/v1"

export const FOREX_PAIRS = [
  { pair: "EUR/USD", base: "EUR", quote: "USD", digits: 4 },
  { pair: "GBP/USD", base: "GBP", quote: "USD", digits: 4 },
  { pair: "USD/JPY", base: "USD", quote: "JPY", digits: 2 },
  { pair: "USD/CHF", base: "USD", quote: "CHF", digits: 4 },
  { pair: "AUD/USD", base: "AUD", quote: "USD", digits: 4 },
  { pair: "USD/CAD", base: "USD", quote: "CAD", digits: 4 },
  { pair: "NZD/USD", base: "NZD", quote: "USD", digits: 4 },
  { pair: "EUR/GBP", base: "EUR", quote: "GBP", digits: 4 },
] as const

export type ForexPair = (typeof FOREX_PAIRS)[number]

const RANGES: { key: string; days: number }[] = [
  { key: "1M", days: 31 },
  { key: "3M", days: 92 },
  { key: "6M", days: 183 },
  { key: "1Y", days: 365 },
]

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

type Series = { rates: Record<string, Record<string, number>> }

export function ForexChart({ pair, height = 260 }: { pair: ForexPair; height?: number }) {
  const [tf, setTf] = React.useState("3M")
  const range = RANGES.find((r) => r.key === tf) ?? RANGES[1]!
  // Start date is anchored to the day so the cache key is stable within a session.
  const start = isoDaysAgo(range.days)
  const url = `${API}/${start}..?base=${pair.base}&symbols=${pair.quote}`
  const { data, loading, error } = useCachedFetch<Series>(`fx:${pair.pair}:${start}`, { url, ttl: 60 * 60 * 1000 })

  const points: PricePoint[] = React.useMemo(
    () =>
      Object.entries(data?.rates ?? {})
        .map(([date, r]) => ({ t: Date.parse(date + "T00:00:00Z"), v: r[pair.quote] ?? 0 }))
        .filter((p) => p.v > 0)
        .sort((a, b) => a.t - b.t),
    [data, pair.quote]
  )

  return (
    <PriceChart
      id={pair.pair.replace("/", "")}
      points={points}
      loading={loading}
      error={!!error}
      timeframes={RANGES.map((r) => r.key)}
      timeframe={tf}
      onTimeframe={setTf}
      formatTime={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      digits={pair.digits}
      prefix=""
      height={height}
    />
  )
}

type Latest = { date: string; rates: Record<string, number> }

/** Majors grid: latest ECB fix vs the previous one. Replaces the TradingView heat map. */
export function ForexOverview({ onSelect, selected }: { onSelect?: (pair: ForexPair) => void; selected?: string }) {
  // One request each for today's and the prior fixes (USD base), then derive
  // every pair locally — cross rates included.
  const symbols = "EUR,GBP,JPY,CHF,AUD,CAD,NZD"
  const { data: latest, loading } = useCachedFetch<Latest>("fx:latest", { url: `${API}/latest?base=USD&symbols=${symbols}`, ttl: 60 * 60 * 1000 })
  const start = isoDaysAgo(7)
  const { data: history } = useCachedFetch<Series>(`fx:prev:${start}`, { url: `${API}/${start}..?base=USD&symbols=${symbols}`, ttl: 60 * 60 * 1000 })

  const rows = React.useMemo(() => {
    if (!latest) return []
    const usd = { ...latest.rates, USD: 1 }
    const dates = Object.keys(history?.rates ?? {}).sort()
    const prevDate = dates.filter((d) => d < latest.date).pop()
    const prev = prevDate ? { ...history!.rates[prevDate]!, USD: 1 } : null
    const rate = (r: Record<string, number>, p: ForexPair) => (r[p.quote] ?? 0) / (r[p.base] ?? 1)
    return FOREX_PAIRS.map((p) => {
      const now = rate(usd, p)
      const before = prev ? rate(prev, p) : now
      return { ...p, price: now, change: before ? ((now - before) / before) * 100 : 0 }
    })
  }, [latest, history])

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--background-secondary)_80%,transparent)]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {(rows.length ? rows : FOREX_PAIRS.map((p) => ({ ...p, price: 0, change: 0 }))).map((r) => (
          <button
            key={r.pair}
            onClick={() => onSelect?.(r)}
            className={`rounded-[8px] p-3 text-left transition-colors ${selected === r.pair ? "bg-background ring-1 ring-[var(--brand-accent)]" : "bg-background hover:bg-hover"}`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12px] font-bold text-foreground">{r.pair}</span>
              <span className={`text-[11px] font-medium tabular-nums ${r.change >= 0 ? "text-success" : "text-destructive"}`}>
                {r.change >= 0 ? "+" : ""}
                {r.change.toFixed(2)}%
              </span>
            </div>
            <div className="text-[14px] font-medium tabular-nums text-foreground">{r.price ? fmtPrice(r.price, r.digits) : "—"}</div>
          </button>
        ))}
      </div>
      <div className="px-4 pb-3 pt-1 text-[11px] text-less">ECB reference rates via Frankfurter · updated daily{latest ? ` · ${latest.date}` : ""}</div>
    </div>
  )
}
