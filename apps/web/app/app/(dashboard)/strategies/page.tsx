"use client"

import * as React from "react"

const strategies = [
  {
    id: "01",
    name: "Crypto Trend Following",
    description: "We identify high-probability trends on 4H and Daily timeframes using EMA crossovers and ADX confirmation. Trades are entered only when the market is clearly trending — never in ranging conditions.",
    winRate: "91%",
    riskReward: "3.2:1",
    pairs: "6+",
    status: "Primary",
    statusColor: "green",
    markets: ["ETH/USDT", "BTC/USDT", "SOL/USDT", "BNB/USDT"],
    timeframe: "4H entry, Daily trend filter",
    indicators: "EMA 50/200, ADX, RSI",
    confidence: 91,
  },
  {
    id: "02",
    name: "Precision Scalping",
    description: "Short-duration trades on the 1m and 5m charts during London and New York sessions. We target 10–20 pip moves with tight stop-losses using order flow and liquidity zone analysis.",
    winRate: "87%",
    riskReward: "2.5:1",
    pairs: "8-15",
    status: "Active",
    statusColor: "blue",
    markets: ["ETH/USDT", "EUR/GBP", "XRP/USDT"],
    timeframe: "London Open, NY Open",
    indicators: "VWAP, Order Flow, Bollinger Bands",
    confidence: 87,
  },
  {
    id: "03",
    name: "Breakout Trading",
    description: "We wait for price to consolidate at key support/resistance zones, then enter aggressively on confirmed breakouts with volume. News catalysts and session opens are our primary triggers.",
    winRate: "89%",
    riskReward: "4.1:1",
    pairs: "8+",
    status: "Active",
    statusColor: "amber",
    markets: ["BNB/USDT", "GBP/JPY", "DOGE/USDT"],
    timeframe: "15m confirmation, 1H structure",
    indicators: "Volume, S/R Zones, ATR",
    confidence: 89,
  },
]

/** Accent per strategy, driven by the semantic tokens so it works in both themes. */
const TONE: Record<string, { fg: string; bg: string; tag: string }> = {
  green: { fg: "var(--color-success)", bg: "var(--bg-success)", tag: "tag-green" },
  blue: { fg: "var(--color-info)", bg: "var(--bg-info)", tag: "tag-blue" },
  amber: { fg: "var(--color-warning)", bg: "var(--bg-warning)", tag: "tag-amber" },
}

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">How We Grow Your Money</div>
        <h1 className="text-xl font-medium text-foreground">Trading Strategies</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded tag tag-green">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
          <span className="text-[11px] font-medium">3 Active Crypto Strategies</span>
        </div>
        <p className="text-sm text-muted-foreground">All strategies run simultaneously on pool capital. Returns are compounded across cycles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {strategies.map((strat, i) => {
          const tone = TONE[strat.statusColor] ?? TONE.green!
          return (
          <div key={i} className="bg-card border border-border rounded-lg overflow-hidden hover:bg-secondary/30 transition-colors">
            <div className="p-4 pb-0">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: tone.bg }}>
                  <svg className="w-4 h-4" style={{ 
                    color: tone.fg
                  }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
                <span className={`tag ${tone.tag}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
                  {strat.status}
                </span>
              </div>

              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Strategy {strat.id}</div>
              <h3 className="text-[15px] font-medium text-foreground mb-2">{strat.name}</h3>
              <p className="text-[13px] text-muted-foreground mb-3 leading-normal">{strat.description}</p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-secondary rounded">
                  <div className="text-[13px] font-medium" style={{ color: tone.fg }}>{strat.winRate}</div>
                  <div className="text-[10px] text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center p-2 bg-secondary rounded">
                  <div className="text-[13px] font-medium" style={{ color: "var(--color-success)" }}>{strat.riskReward}</div>
                  <div className="text-[10px] text-muted-foreground">Avg R:R</div>
                </div>
                <div className="text-center p-2 bg-secondary rounded">
                  <div className="text-[13px] font-medium text-foreground">{strat.pairs}</div>
                  <div className="text-[10px] text-muted-foreground">{i === 1 ? 'Trades/Day' : 'Pairs'}</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium" style={{ color: tone.fg }}>{strat.confidence >= 80 ? 'Very High' : 'High'}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${strat.confidence}%`, background: tone.fg }} />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Markets:</span> {strat.markets.join(", ")}<br/>
                <span className="font-medium text-foreground">Timeframes:</span> {strat.timeframe}<br/>
                <span className="font-medium text-foreground">Indicators:</span> {strat.indicators}
              </p>
            </div>
            
            <div className="px-4 py-2 bg-secondary border-t border-border">
              <span className="text-[11px] font-medium" style={{ color: "var(--color-success)" }}>✓ {strat.winRate} of trades</span>
              <span className="text-[11px] text-muted-foreground"> close in profit</span>
            </div>
          </div>
          )
        })}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-medium text-foreground">Combined Pool Performance</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border">
          <div className="py-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Win Rate</div>
            <div className="text-lg font-medium text-[var(--color-success)]">89%</div>
          </div>
          <div className="py-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Reward:Risk</div>
            <div className="text-lg font-medium text-[var(--color-warning)]">3.3:1</div>
          </div>
          <div className="py-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Pairs</div>
            <div className="text-lg font-medium text-[var(--color-info)]">20+</div>
          </div>
          <div className="py-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily Trades</div>
            <div className="text-lg font-medium text-foreground">10-20</div>
          </div>
          <div className="py-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Profitable Cycles</div>
            <div className="text-lg font-medium text-[var(--color-success)]">100%</div>
          </div>
        </div>
      </div>
    </div>
  )
}