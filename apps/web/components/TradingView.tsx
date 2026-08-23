"use client"

import * as React from "react"

interface TradingViewWidgetProps {
  symbol?: string
  theme?: "light" | "dark"
  height?: number
}

export function TradingViewWidget({ 
  symbol = "FX:EURUSD", 
  theme = "light",
  height = 400 
}: TradingViewWidgetProps) {
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
          symbol: symbol,
          interval: "60",
          timezone: "Etc/UTC",
          theme: theme === "dark" ? "dark" : "light",
          style: "1",
          locale: "en",
          toolbar_bg: theme === "dark" ? "#1a1a1a" : "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: container.id,
          hide_side_toolbar: false,
          studies: ["MASimple@tv-basicstudies"],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          backgroundColor: theme === "dark" ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)",
        })
      }
    }
    container.appendChild(script)

    return () => {
      container.innerHTML = ""
    }
  }, [symbol, theme, height])

  return (
    <div 
      id={`tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, "_")}`}
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden"
    />
  )
}

export function ForexMarketWidget({ theme = "light" }: { theme?: "light" | "dark" }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      pairs: [
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "USDCHF",
        "AUDUSD",
        "USDCAD",
        "NZDUSD",
        "EURGBP",
        "EURJPY",
        "GBPJPY",
      ],
      isTransparent: theme === "dark",
      colorTheme: theme === "dark" ? "dark" : "light",
      locale: "en",
    })
    container.appendChild(script)

    return () => {
      container.innerHTML = ""
    }
  }, [theme])

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
    />
  )
}

export function CryptoMarketWidget({ theme = "light" }: { theme?: "light" | "dark" }) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 400,
      defaultColumn: "overview",
      defaultScreen: "general",
      market: "crypto",
      showToolbar: true,
      colorTheme: theme === "dark" ? "dark" : "light",
      isTransparent: theme === "dark",
      locale: "en",
    })
    container.appendChild(script)

    return () => {
      container.innerHTML = ""
    }
  }, [theme])

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
    />
  )
}