"use client"

import * as React from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

const mockData = [
  { time: "00:00", btc: 42000, eth: 2200, sol: 95 },
  { time: "04:00", btc: 42150, eth: 2215, sol: 96 },
  { time: "08:00", btc: 42300, eth: 2230, sol: 98 },
  { time: "12:00", btc: 42500, eth: 2250, sol: 100 },
  { time: "16:00", btc: 42800, eth: 2280, sol: 102 },
  { time: "20:00", btc: 43000, eth: 2300, sol: 105 },
  { time: "24:00", btc: 43200, eth: 2320, sol: 107 },
]

const coinData = [
  { symbol: "BTC", name: "Bitcoin", price: "$43,245", change: "+2.34%", positive: true },
  { symbol: "ETH", name: "Ethereum", price: "$2,342", change: "+1.87%", positive: true },
  { symbol: "SOL", name: "Solana", price: "$108.50", change: "+4.21%", positive: true },
]

type CoinSymbol = "BTC" | "ETH" | "SOL"

interface CryptoChartProps {
  coin?: CoinSymbol
  showSelector?: boolean
}

export function CryptoChart({ coin = "BTC", showSelector = true }: CryptoChartProps) {
  const [selectedCoin, setSelectedCoin] = React.useState<CoinSymbol>(coin)
  
  const getColor = (c: CoinSymbol) => {
    switch(c) {
      case "BTC": return "#F7931A"
      case "ETH": return "#627EEA"
      case "SOL": return "#9945FF"
      default: return "#3B82F6"
    }
  }

  const coinKey = selectedCoin.toLowerCase() as "btc" | "eth" | "sol"

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      {showSelector && (
        <div className="flex items-center gap-2 mb-4">
          {(coinData as { symbol: CoinSymbol }[]).map((c) => (
            <button
              key={c.symbol}
              onClick={() => setSelectedCoin(c.symbol)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedCoin === c.symbol 
                  ? "bg-accent text-white" 
                  : "bg-muted text-secondary hover:text-primary"
              }`}
            >
              {c.symbol}
            </button>
          ))}
        </div>
      )}

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData}>
            <defs>
              <linearGradient id={`gradient-${selectedCoin}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={getColor(selectedCoin)} stopOpacity={0.3} />
                <stop offset="100%" stopColor={getColor(selectedCoin)} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8EC" vertical={false} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: '#9CA3AF' }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#9CA3AF' }} 
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              contentStyle={{ 
                background: '#FFFFFF', 
                border: '1px solid #E8E8EC',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, selectedCoin]}
            />
            <Area 
              type="monotone" 
              dataKey={coinKey} 
              stroke={getColor(selectedCoin)} 
              strokeWidth={2}
              fill={`url(#gradient-${selectedCoin})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-primary">
            {selectedCoin === "BTC" ? "Bitcoin" : selectedCoin === "ETH" ? "Ethereum" : "Solana"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-primary">
            {coinData.find(c => c.symbol === selectedCoin)?.price}
          </span>
          <span className={`text-xs ml-2 ${coinData.find(c => c.symbol === selectedCoin)?.positive ? 'text-green-600' : 'text-red-600'}`}>
            {coinData.find(c => c.symbol === selectedCoin)?.change}
          </span>
        </div>
      </div>
    </div>
  )
}

export function MarketTicker() {
  return (
    <div className="flex items-center gap-6 overflow-x-auto py-2">
      {coinData.map((coin) => (
        <div key={coin.symbol} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm font-medium text-primary">{coin.symbol}</span>
          <span className="text-sm text-secondary">{coin.price}</span>
          <span className={`text-xs ${coin.positive ? 'text-green-600' : 'text-red-600'}`}>
            {coin.change}
          </span>
        </div>
      ))}
    </div>
  )
}