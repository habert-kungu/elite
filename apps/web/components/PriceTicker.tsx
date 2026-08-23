"use client"

import * as React from "react"

interface PriceData {
  symbol: string
  price: string
  change: string
  positive: boolean
  lastUpdated: number
}

const CACHE_DURATION = 60000 // 1 minute cache
const CRYPTO_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]

function getCachedPrices(): Record<string, PriceData> | null {
  if (typeof window === "undefined") return null
  try {
    const cached = localStorage.getItem("crypto_prices_cache")
    if (cached) {
      const data = JSON.parse(cached) as Record<string, PriceData>
      const firstEntry = Object.values(data)[0]
      if (firstEntry && Date.now() - firstEntry.lastUpdated < CACHE_DURATION) {
        return data
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function setCachedPrices(prices: Record<string, PriceData>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("crypto_prices_cache", JSON.stringify(prices))
  } catch {
    // Ignore storage errors
  }
}

const DEFAULT_PRICES: Record<string, PriceData> = {
  BTC: { symbol: "BTC", price: "76,843", change: "+1.2%", positive: true, lastUpdated: Date.now() },
  ETH: { symbol: "ETH", price: "2,456", change: "+2.1%", positive: true, lastUpdated: Date.now() },
  SOL: { symbol: "SOL", price: "112.45", change: "+3.8%", positive: true, lastUpdated: Date.now() },
  BNB: { symbol: "BNB", price: "618.20", change: "+0.5%", positive: true, lastUpdated: Date.now() },
}

interface CryptoTickerProps {
  className?: string
  compact?: boolean
}

export function CryptoTicker({ className = "", compact = false }: CryptoTickerProps) {
  const [prices, setPrices] = React.useState<Record<string, PriceData>>(DEFAULT_PRICES)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const cached = getCachedPrices()
    if (cached) {
      setPrices(cached)
      setIsLoading(false)
    }

    // Try to load live prices from TradingView widget data
    const loadPrices = async () => {
      try {
        const response = await fetch(
          "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT&symbol=ETHUSDT&symbol=SOLUSDT&symbol=BNBUSDT"
        )
        if (response.ok) {
          const data = await response.json()
          const newPrices: Record<string, PriceData> = {}
          
          Array.isArray(data) ? data : [data].forEach((item: any) => {
            const symbol = item.symbol.replace("USDT", "")
            const positive = parseFloat(item.priceChangePercent) >= 0
            newPrices[symbol] = {
              symbol,
              price: parseFloat(item.lastPrice).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: item.lastPrice < 1 ? 4 : 2,
              }),
              change: `${positive ? "+" : ""}${parseFloat(item.priceChangePercent).toFixed(2)}%`,
              positive,
              lastUpdated: Date.now(),
            }
          })
          
          if (Object.keys(newPrices).length > 0) {
            setPrices(newPrices)
            setCachedPrices(newPrices)
          }
        }
      } catch {
        // Use cached or default prices
      } finally {
        setIsLoading(false)
      }
    }

    loadPrices()
    const interval = setInterval(loadPrices, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  const priceList = Object.values(prices)

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {priceList.map((coin) => (
          <div key={coin.symbol} className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-foreground">{coin.symbol}</span>
            <span className="text-[10px] font-mono text-foreground">${coin.price.split(".")[0]}</span>
            <span className={`text-[9px] font-mono ${coin.positive ? "text-[oklch(0.58_0.1_165)]" : "text-[oklch(0.6_0_0)]"}`}>
              {coin.change}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-4 overflow-x-auto py-2 ${className}`}>
      {priceList.map((coin) => (
        <div 
          key={coin.symbol} 
          className="flex items-center gap-2.5 px-3 py-1.5 bg-secondary/50 rounded-lg whitespace-nowrap"
        >
          <span className="text-xs font-bold text-foreground">{coin.symbol}/USDT</span>
          <span className="text-xs font-mono text-foreground">${coin.price}</span>
          <span className={`text-[10px] font-mono ${coin.positive ? "text-[oklch(0.58_0.1_165)]" : "text-[oklch(0.6_0_0)]"}`}>
            {coin.change}
          </span>
          {!isLoading && (
            <span className="w-1.5 h-1.5 bg-[oklch(0.58_0.1_165)] rounded-full" />
          )}
        </div>
      ))}
    </div>
  )
}

interface MiniTickerProps {
  symbols?: string[]
}

export function MiniTicker({ symbols = CRYPTO_SYMBOLS }: MiniTickerProps) {
  const [prices, setPrices] = React.useState<Record<string, PriceData>>(DEFAULT_PRICES)

  React.useEffect(() => {
    const cached = getCachedPrices()
    if (cached) setPrices(cached)

    const fetchPrices = async () => {
      try {
        const symbolsParam = symbols.join("&symbol=")
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbolsParam}`)
        if (response.ok) {
          const data = await response.json()
          const newPrices: Record<string, PriceData> = {}
          ;(Array.isArray(data) ? data : [data]).forEach((item: any) => {
            const symbol = item.symbol.replace("USDT", "")
            const positive = parseFloat(item.priceChangePercent) >= 0
            newPrices[symbol] = {
              symbol,
              price: parseFloat(item.lastPrice).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: item.lastPrice < 1 ? 4 : 2,
              }),
              change: `${positive ? "+" : ""}${parseFloat(item.priceChangePercent).toFixed(2)}%`,
              positive,
              lastUpdated: Date.now(),
            }
          })
          setPrices(prev => ({ ...prev, ...newPrices }))
          setCachedPrices({ ...prices, ...newPrices })
        }
      } catch {
        // Ignore errors
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2">
      {Object.values(prices).slice(0, 4).map((coin) => (
        <div key={coin.symbol} className="text-[10px]">
          <span className="text-muted-foreground">{coin.symbol}</span>
          <span className="mx-1 text-foreground font-mono">${coin.price.split(".")[0]}</span>
          <span className={coin.positive ? "text-[oklch(0.58_0.1_165)]" : "text-[oklch(0.6_0_0)]"}>
            {coin.change}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TradingViewChart({ symbol = "BTCUSDT", height = 300 }: { symbol?: string; height?: number }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          width: "100%",
          height: height,
          symbol: `BINANCE:${symbol}`,
          interval: "60",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: container.id,
          hide_side_toolbar: false,
          studies: ["MASimple@tv-basicstudies"],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
        })
      }
    }
    container.appendChild(script)

    return () => {
      container.innerHTML = ""
    }
  }, [symbol, height])

  return <div id={`tv_${symbol}`} ref={containerRef} className="w-full rounded-lg overflow-hidden" />
}

export function TradingViewNewsWidget() {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: "light",
      isTransparent: false,
      locale: "en",
      width: "100%",
      height: 400,
    })
    container.appendChild(script)

    return () => {
      container.innerHTML = ""
    }
  }, [])

  return <div ref={containerRef} className="w-full" />
}