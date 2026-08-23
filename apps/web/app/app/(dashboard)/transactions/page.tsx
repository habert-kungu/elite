"use client"


import { Card, StatusPill, statusTone } from "@/components/ui"
import * as React from "react"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch } from "@/lib/use-cached-fetch"

interface Transaction {
  id: string
  type: string
  amount: number
  net: number
  fee: number
  currency: string
  status: string
  note: string
  txHash?: string
  createdAt: string
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const { data, loading } = useCachedFetch<{ transactions: Transaction[] }>(user ? "/api/user/transactions" : null, { ttl: 60_000 })
  const transactions = React.useMemo(() => data?.transactions ?? [], [data])
  const [filter, setFilter] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [selectedTx, setSelectedTx] = React.useState<Transaction | null>(null)

  const filtered = transactions.filter(tx => {
    if (filter !== "all" && tx.type !== filter) return false
    if (search && !tx.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    totalDeposits: transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.net, 0),
    totalReturns: transactions.filter(t => t.type === 'return').reduce((sum, t) => sum + t.net, 0),
    totalWithdrawals: transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.net, 0),
    totalFees: transactions.reduce((sum, t) => t.type !== 'return' ? sum + (t.fee || 0) : sum, 0),
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Transactions</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Your complete transaction history</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-mono mb-1">Deposits</div>
          <div className="text-sm sm:text-lg font-medium text-foreground">${stats.totalDeposits.toLocaleString()}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-mono mb-1">Returns</div>
          <div className="text-sm sm:text-lg font-medium text-[var(--color-success)]">+${stats.totalReturns.toLocaleString()}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-mono mb-1">Withdrawals</div>
          <div className="text-sm sm:text-lg font-medium text-foreground">-${stats.totalWithdrawals.toLocaleString()}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-mono mb-1">Fees Paid</div>
          <div className="text-sm sm:text-lg font-medium text-muted-foreground">-${stats.totalFees.toLocaleString()}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-[oklch(0.62_0.12_178)] focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: "all", label: "All" },
              { key: "deposit", label: "Deposit" },
              { key: "return", label: "Return" },
              { key: "withdrawal", label: "Withdraw" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  filter === f.key 
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transaction List - Mobile Card View */}
      <div className="block lg:hidden space-y-2">
        {filtered.map((tx) => (
          <div 
            key={tx.id} 
            className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-[oklch(0.62_0.12_178)/30] transition-all"
            onClick={() => setSelectedTx(tx)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-mono text-muted-foreground">{tx.id.slice(0, 12)}</span>
              <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${
                tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' :
                tx.type === 'return' ? 'bg-[oklch(0.62_0.12_178)/20] text-primary' :
                'bg-red-500/20 text-red-400'
              }`}>
                {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm sm:text-base font-medium ${
                  tx.type === 'return' ? 'text-[var(--color-success)]' : 'text-foreground'
                }`}>
                  {tx.type === 'deposit' || tx.type === 'withdrawal' ? (
                    <span>{tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString()}</span>
                  ) : (
                    <span>+${tx.amount.toLocaleString()}</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">{formatDate(tx.createdAt)} • {formatTime(tx.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-muted-foreground">Net</div>
                <div className="text-sm font-medium text-foreground">${tx.net.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-secondary rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="text-sm font-medium text-foreground">No transactions</div>
            <div className="text-xs text-muted-foreground mt-0.5">Try adjusting your filters</div>
          </Card>
        )}
      </div>

      {/* Transaction Table - Desktop */}
      <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase text-muted-foreground">Net</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono uppercase text-muted-foreground">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedTx(tx)}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">{tx.id.slice(0, 12)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">{formatDate(tx.createdAt)}</div>
                    <div className="text-[10px] text-muted-foreground">{formatTime(tx.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' :
                      tx.type === 'return' ? 'bg-[oklch(0.62_0.12_178)/20] text-primary' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-medium ${
                      tx.type === 'return' ? 'text-[var(--color-success)]' : 'text-foreground'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'withdrawal' ? (
                        <span>{tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString()}</span>
                      ) : (
                        <span>+${tx.amount.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{tx.currency}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">${tx.net.toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-muted-foreground max-w-[180px] truncate">{tx.note}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTx(null)}>
          <div className="w-full max-w-md p-5 bg-card border border-border rounded-lg" onClick={() => {}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Transaction ID</span>
                <span className="text-xs font-mono text-foreground">{selectedTx.id.slice(0, 16)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Date & Time</span>
                <span className="text-xs text-foreground">{formatDate(selectedTx.createdAt)} at {formatTime(selectedTx.createdAt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Type</span>
                <span className={`text-xs font-medium ${
                  selectedTx.type === 'deposit' ? 'text-emerald-500' :
                  selectedTx.type === 'return' ? 'text-primary' :
                  'text-red-400'
                }`}>
                  {selectedTx.type.charAt(0).toUpperCase() + selectedTx.type.slice(1)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Amount</span>
                <span className="text-xs font-medium text-foreground">${selectedTx.amount.toLocaleString()} {selectedTx.currency}</span>
              </div>
              {selectedTx.type !== 'return' && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground">Fee (16.5%)</span>
                  <span className="text-xs font-medium text-muted-foreground">-${selectedTx.fee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Net Received</span>
                <span className="text-xs font-medium text-foreground">${selectedTx.net.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">Status</span>
                <StatusPill tone={statusTone(selectedTx.status)} className="capitalize">{selectedTx.status}</StatusPill>
              </div>
              {selectedTx.txHash && (
                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block mb-1">TX Hash</span>
                  <span className="text-xs font-mono text-foreground">{selectedTx.txHash}</span>
                </div>
              )}
              <div className="pt-2">
                <span className="text-xs text-muted-foreground block mb-1">Note</span>
                <span className="text-xs text-foreground">{selectedTx.note}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}