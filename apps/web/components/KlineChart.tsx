"use client"

import * as React from "react"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { PriceChart, type PricePoint } from "./PriceChart"

/** Crypto price chart fed straight from Binance klines; cached per symbol/interval, refreshed every 30s. */

const INTERVALS: { key: string; binance: string; limit: number }[] = [
  { key: "1H", binance: "1m", limit: 60 },
  { key: "4H", binance: "5m", limit: 48 },
  { key: "1D", binance: "15m", limit: 96 },
  { key: "1W", binance: "1h", limit: 168 },
  { key: "1M", binance: "4h", limit: 180 },
]

export function KlineChart({ symbol, height = 260 }: { symbol: string; height?: number }) {
  const [tf, setTf] = React.useState("1D")
  const interval = INTERVALS.find((i) => i.key === tf) ?? INTERVALS[2]!
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval.binance}&limit=${interval.limit}`
  const { data, loading, error, refresh } = useCachedFetch<unknown[][]>(`klines:${symbol}:${interval.binance}`, { url, ttl: 30_000 })

  React.useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const points: PricePoint[] = React.useMemo(() => (data ?? []).map((k) => ({ t: Number(k[0]), v: Number(k[4]) })), [data])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return tf === "1W" || tf === "1M"
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <PriceChart
      id={symbol}
      points={points}
      loading={loading}
      error={!!error}
      timeframes={INTERVALS.map((i) => i.key)}
      timeframe={tf}
      onTimeframe={setTf}
      formatTime={formatTime}
      height={height}
    />
  )
}
