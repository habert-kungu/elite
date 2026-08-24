"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Badge, Card, Notice, Segmented, Spinner, Tabs } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { KlineChart } from "@/components/KlineChart"
import { ForexChart, ForexOverview, FOREX_PAIRS, type ForexPair } from "@/components/ForexChart"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { IconInfoCircle } from "@tabler/icons-react"

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

/** Signed 24h change, teal up / coral down (chart tokens). */
function Change({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0
  return (
    <span className={`font-bold tabular-nums ${className}`} style={{ color: up ? "var(--chart-up)" : "var(--chart-down)" }}>
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  )
}

/** Card with a Sub 2 title row; wraps charts and market lists. */
function MarketCard({ title, children, action, live, className = "" }: { title: string; children: React.ReactNode; action?: React.ReactNode; live?: boolean; className?: string }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[16px] font-bold leading-6 text-foreground">{title}</h3>
          {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />}
        </div>
        {action && <div className="min-w-0 max-w-full text-[12px] leading-[18px] text-less sm:flex-shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

function LoadingOverlay({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--background-secondary)_80%,transparent)]">
      <div className="flex flex-col items-center gap-2 text-less">
        <Spinner className="h-6 w-6" />
        <span className="text-[12px] leading-[18px]">{label}</span>
      </div>
    </div>
  )
}

function CryptoScreener({ coins, loading, selected, onSelect }: { coins: LiveCoin[]; loading: boolean; selected: string; onSelect: (base: string) => void }) {
  return (
    <div className="relative">
      {loading && <LoadingOverlay />}
      <div className="grid grid-cols-2 gap-2 px-5 pb-3 sm:grid-cols-4">
        {coins.slice(0, 8).map((coin) => {
          const active = selected === coin.base
          return (
            <button
              key={coin.base}
              type="button"
              onClick={() => onSelect(coin.base)}
              aria-pressed={active}
              className={`rounded-[8px] p-3 text-left transition-colors ${active ? "bg-background ring-2 ring-primary" : "bg-background hover:bg-hover"}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-foreground">{coin.base}</span>
                <Change value={coin.change} className="text-[12px]" />
              </div>
              <div className="font-mono text-[14px] tabular-nums text-foreground">${formatPrice(coin.price)}</div>
            </button>
          )
        })}
      </div>
      <div className="px-5 pb-4 text-[12px] leading-[18px] text-less">Live prices from Binance · refreshes every 30s</div>
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

const MARKET_TABS = [
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "news", label: "News" },
]

export default function ExplorePage() {
  const [activeTab, setActiveTab] = React.useState("crypto")
  const [selectedForex, setSelectedForex] = React.useState<ForexPair>(FOREX_PAIRS[0])
  const [selectedCrypto, setSelectedCrypto] = React.useState("BINANCE:BTCUSDT")
  const { coins, loading } = useLivePrices()

  const cryptoPairs = [
    { symbol: "BINANCE:BTCUSDT", label: "BTC" },
    { symbol: "BINANCE:ETHUSDT", label: "ETH" },
    { symbol: "BINANCE:SOLUSDT", label: "SOL" },
    { symbol: "BINANCE:BNBUSDT", label: "BNB" },
    { symbol: "BINANCE:XRPUSDT", label: "XRP" },
    { symbol: "BINANCE:DOGEUSDT", label: "DOGE" },
  ]

  const currentCryptoLabel = cryptoPairs.find((p) => p.symbol === selectedCrypto)?.label || "BTC"
  const selectedBase = selectedCrypto.replace("BINANCE:", "").replace("USDT", "")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Markets"
        description="Live crypto and forex prices, charts and market news."
      />

      <Tabs items={MARKET_TABS} value={activeTab} onChange={setActiveTab} className="tabs-fill-mobile animate-fade-up" />

      {/* Crypto */}
      {activeTab === "crypto" && (
        <div className="space-y-6">
          <MarketCard
            title={`${currentCryptoLabel}/USDT`}
            live
            action={
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">Binance · live</span>
                <Segmented items={cryptoPairs.map((p) => ({ value: p.symbol, label: p.label }))} value={selectedCrypto} onChange={setSelectedCrypto} className="overflow-x-auto" />
              </div>
            }
            className="animate-fade-up"
          >
            <KlineChart symbol={selectedCrypto.replace("BINANCE:", "")} height={260} />
          </MarketCard>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            <div className="space-y-6">
            <MarketCard title="Market overview" live className="animate-fade-up">
              <CryptoScreener coins={coins} loading={loading} selected={selectedBase} onSelect={(base) => setSelectedCrypto(`BINANCE:${base}USDT`)} />
            </MarketCard>

            <Notice tone="info" icon={<IconInfoCircle className="h-4 w-4" stroke={1.8} />}>
              Positions are closed 30 minutes before high-impact events. Capital protected.
            </Notice>
            </div>

            <MarketCard title="Top cryptocurrencies" action="24h change" className="animate-fade-up">
              <div className="overflow-x-auto">
                <table className="table-linear">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th>Name</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coins.map((coin, i) => (
                      <tr key={coin.base} className="cursor-pointer" onClick={() => setSelectedCrypto(`BINANCE:${coin.base}USDT`)}>
                        <td className="text-[12px] text-less">{i + 1}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-active text-[12px] font-bold text-foreground">{coin.base.slice(0, 2)}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground">{coin.name}</div>
                              <div className="text-[12px] leading-[18px] text-less">{coin.base}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right font-mono tabular-nums text-foreground">${formatPrice(coin.price)}</td>
                        <td className="text-right"><Change value={coin.change} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MarketCard>
          </div>
        </div>
      )}

      {/* Forex */}
      {activeTab === "forex" && (
        <div className="space-y-6">
          <MarketCard
            title={selectedForex.pair}
            live
            action={
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">ECB daily fix</span>
                <Segmented
                  items={FOREX_PAIRS.map((p) => ({ value: p.pair, label: p.pair }))}
                  value={selectedForex.pair}
                  onChange={(v) => {
                    const next = FOREX_PAIRS.find((p) => p.pair === v)
                    if (next) setSelectedForex(next)
                  }}
                  className="max-w-full overflow-x-auto"
                />
              </div>
            }
            className="animate-fade-up"
          >
            <ForexChart pair={selectedForex} height={260} />
          </MarketCard>

          <MarketCard title="Majors overview" className="animate-fade-up">
            <ForexOverview selected={selectedForex.pair} onSelect={setSelectedForex} />
          </MarketCard>
        </div>
      )}

      {/* News */}
      {activeTab === "news" && (
        <MarketCard title="Latest news" className="animate-fade-up">
          <TradingViewNews />
        </MarketCard>
      )}

    </div>
  )
}
