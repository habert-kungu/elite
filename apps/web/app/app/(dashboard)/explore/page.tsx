"use client"

import { Card } from "@/components/ui"
import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { KlineChart } from "@/components/KlineChart"
import { ForexChart, ForexOverview, FOREX_PAIRS, type ForexPair } from "@/components/ForexChart"
import { useCachedFetch } from "@/lib/use-cached-fetch"

// Symbols we track, with display names, in rank order.
const TRACKED = [
  { sym: "BTCUSDT", base: "BTC", name: "Bitcoin" },
  { sym: "ETHUSDT", base: "ETH", name: "Ethereum" },
  { sym: "SOLUSDT", base: "SOL", name: "Solana" },
  { sym: "BNBUSDT", base: "BNB", name: "BNB" },
  { sym: "XRPUSDT", base: "XRP", name: "XRP" },
  { sym: "DOGEUSDT", base: "DOGE", name: "Dogecoin" },
  { sym: "ADAUSDT", base: "ADA", name: "Cardano" },
  { sym: "AVAXUSDT", base: "AVAX", name: "Avalanche" },
]

type LiveCoin = { base: string; name: string; price: number; change: number }

const FALLBACK: LiveCoin[] = TRACKED.map((t, i) => ({
  base: t.base,
  name: t.name,
  price: [76843, 2456, 112.45, 618.2, 0.52, 0.14, 0.58, 38.9][i] ?? 0,
  change: [1.2, 2.1, 3.8, 0.5, 1.4, -0.6, 0.9, 2.3][i] ?? 0,
}))

function formatPrice(p: number) {
  return p.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: p < 1 ? 4 : 2,
  })
}

/**
 * Live 24h ticker data from Binance. Cached (memory + session) so returning to
 * this page paints the last known prices immediately, then refreshes every 30s.
 */
function useLivePrices() {
  const symbolsParam = encodeURIComponent(JSON.stringify(TRACKED.map((t) => t.sym)))
  const { data, loading, error, refresh } = useCachedFetch<{ symbol: string; lastPrice: string; priceChangePercent: string }[]>("binance:24h", {
    url: `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
    ttl: 30_000,
  })

  React.useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const coins = React.useMemo<LiveCoin[]>(() => {
    if (!data) return FALLBACK
    const bySymbol = new Map(data.map((d) => [d.symbol, d]))
    const next = TRACKED.map((t) => {
      const d = bySymbol.get(t.sym)
      return { base: t.base, name: t.name, price: d ? parseFloat(d.lastPrice) : 0, change: d ? parseFloat(d.priceChangePercent) : 0 }
    }).filter((c) => c.price > 0)
    return next.length ? next : FALLBACK
  }, [data])

  return { coins, loading: loading && !error }
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-success)] px-2 py-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
      <span className="text-[10px] font-semibold text-[var(--color-success)]">Live</span>
    </span>
  )
}

function ChartContainer({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-medium text-foreground sm:text-xs">{title}</h3>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}

function LoadingOverlay({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}


function CryptoScreener({ coins, loading }: { coins: LiveCoin[]; loading: boolean }) {
  return (
    <div className="relative">
      {loading && <LoadingOverlay />}
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
        {coins.slice(0, 8).map((coin) => (
          <div key={coin.base} className="rounded-lg bg-secondary/40 p-2 sm:p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground">{coin.base}</span>
              <span className={`text-[9px] font-semibold ${coin.change >= 0 ? "text-[var(--color-success)]" : "text-destructive"}`}>
                {coin.change >= 0 ? "+" : ""}
                {coin.change.toFixed(2)}%
              </span>
            </div>
            <div className="font-mono text-[11px] text-foreground sm:text-xs tabular-nums">${formatPrice(coin.price)}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 text-center text-[9px] text-muted-foreground">Live prices from Binance · refreshes every 30s</div>
    </div>
  )
}

/**
 * TradingView "embed-widget-*.js" widgets are SCRIPTS, not iframe pages — they
 * must be injected as a <script> whose text body is the JSON config, into a
 * container div. (Using them as an iframe src renders the raw JS source.)
 */
function TradingViewScriptWidget({
  scriptName,
  config,
  height,
}: {
  scriptName: string
  config: Record<string, unknown>
  height: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const configKey = JSON.stringify(config)

  React.useEffect(() => {
    const host = ref.current
    if (!host) return
    host.innerHTML = ""
    const widget = document.createElement("div")
    widget.className = "tradingview-widget-container__widget"
    host.appendChild(widget)
    const script = document.createElement("script")
    script.src = `https://s3.tradingview.com/external-embedding/${scriptName}`
    script.async = true
    script.type = "text/javascript"
    script.innerHTML = configKey
    host.appendChild(script)
    return () => {
      host.innerHTML = ""
    }
  }, [scriptName, configKey])

  return <div ref={ref} className="tradingview-widget-container" style={{ height, overflow: "hidden" }} />
}


function TradingViewNews() {
  const { resolvedTheme } = useTheme()
  const colorTheme = resolvedTheme === "dark" ? "dark" : "light"
  return (
    <TradingViewScriptWidget
      scriptName="embed-widget-timeline.js"
      height={360}
      config={{
        feedMode: "market",
        market: "crypto",
        isTransparent: false,
        displayMode: "regular",
        width: "100%",
        height: 360,
        colorTheme,
        locale: "en",
      }}
    />
  )
}

export default function ExplorePage() {
  const [activeTab, setActiveTab] = React.useState("crypto")
  const [selectedForex, setSelectedForex] = React.useState<ForexPair>(FOREX_PAIRS[0])
  const [selectedCrypto, setSelectedCrypto] = React.useState("BINANCE:BTCUSDT")
  const { coins, loading } = useLivePrices()

  const tabs = [
    { id: "crypto", label: "Crypto" },
    { id: "forex", label: "Forex" },
    { id: "news", label: "News" },
  ]

  const cryptoPairs = [
    { symbol: "BINANCE:BTCUSDT", label: "BTC" },
    { symbol: "BINANCE:ETHUSDT", label: "ETH" },
    { symbol: "BINANCE:SOLUSDT", label: "SOL" },
    { symbol: "BINANCE:BNBUSDT", label: "BNB" },
    { symbol: "BINANCE:XRPUSDT", label: "XRP" },
    { symbol: "BINANCE:DOGEUSDT", label: "DOGE" },
  ]

  const currentCryptoLabel = cryptoPairs.find((p) => p.symbol === selectedCrypto)?.label || "BTC"

  const selectorBtn = (active: boolean) =>
    `rounded px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
      active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
    }`

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">Live Data</div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">Explore Markets</h1>
        </div>
        <Link href="/app" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all sm:px-3 sm:text-xs ${
              activeTab === tab.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto">
          <LiveBadge />
        </div>
      </div>

      {/* Crypto Tab */}
      {activeTab === "crypto" && (
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-2.5">
            <div className="flex flex-wrap gap-1">
              {cryptoPairs.map((pair) => (
                <button key={pair.symbol} onClick={() => setSelectedCrypto(pair.symbol)} className={selectorBtn(selectedCrypto === pair.symbol)}>
                  {pair.label}
                </button>
              ))}
            </div>
          </Card>

          <ChartContainer
            title={`${currentCryptoLabel}/USDT`}
            action={<span className="text-[9px] text-muted-foreground">Binance · live</span>}
          >
            <KlineChart symbol={selectedCrypto.replace("BINANCE:", "")} height={260} />
          </ChartContainer>

          <ChartContainer title="Market Overview">
            <CryptoScreener coins={coins} loading={loading} />
          </ChartContainer>

          {/* Live price table */}
          <ChartContainer title="Top Cryptocurrencies">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px]">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-mono uppercase text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left text-[9px] font-mono uppercase text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-right text-[9px] font-mono uppercase text-muted-foreground">Price</th>
                    <th className="px-3 py-2 text-right text-[9px] font-mono uppercase text-muted-foreground">24h</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {coins.map((coin, i) => (
                    <tr
                      key={coin.base}
                      className="cursor-pointer hover:bg-secondary/30"
                      onClick={() => setSelectedCrypto(`BINANCE:${coin.base}USDT`)}
                    >
                      <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">
                            {coin.base.slice(0, 2)}
                          </div>
                          <span className="text-[10px] font-medium text-foreground">{coin.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] font-medium text-foreground tabular-nums">${formatPrice(coin.price)}</td>
                      <td className={`px-3 py-2.5 text-right text-[10px] font-semibold tabular-nums ${coin.change >= 0 ? "text-[var(--color-success)]" : "text-destructive"}`}>
                        {coin.change >= 0 ? "+" : ""}
                        {coin.change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>
        </div>
      )}

      {/* Forex Tab */}
      {activeTab === "forex" && (
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-2.5">
            <div className="flex flex-wrap gap-1">
              {FOREX_PAIRS.map((pair) => (
                <button key={pair.pair} onClick={() => setSelectedForex(pair)} className={selectorBtn(selectedForex.pair === pair.pair)}>
                  {pair.pair}
                </button>
              ))}
            </div>
          </Card>

          <ChartContainer title={selectedForex.pair} action={<span className="text-[9px] text-muted-foreground">ECB daily fix</span>}>
            <ForexChart pair={selectedForex} height={260} />
          </ChartContainer>

          <ChartContainer title="Majors Overview">
            <ForexOverview selected={selectedForex.pair} onSelect={setSelectedForex} />
          </ChartContainer>
        </div>
      )}

      {/* News Tab */}
      {activeTab === "news" && (
        <ChartContainer title="Latest News">
          <TradingViewNews />
        </ChartContainer>
      )}

      {/* Info note */}
      <div className="rounded-lg border border-[var(--color-info)]/20 bg-[var(--bg-info)] p-2.5">
        <p className="text-[10px] text-[var(--color-info)]">
          <span className="font-medium">Note:</span> Positions are closed 30 minutes before high-impact events. Capital protected.
        </p>
      </div>
    </div>
  )
}
