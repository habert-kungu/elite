"use client"

import * as React from "react"
import { Badge, Card, EmptyState, Modal, Skeleton, StatusPill, statusTone, Tabs, type BadgeTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { IconArrowDownLeft, IconArrowUpRight, IconReceipt2, IconSearch, IconTrendingUp } from "@tabler/icons-react"

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

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposits" },
  { value: "return", label: "Returns" },
  { value: "withdrawal", label: "Withdrawals" },
]

/** One cell of the Reports summary strip. */
function SummaryCell({ label, value, tone, hint }: { label: string; value: string; tone?: "success" | "danger" | "muted"; hint?: string }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : tone === "muted" ? "text-less" : "text-foreground"
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <div className="text-[12px] leading-[18px] text-less">{label}</div>
      <div className={`mt-0.5 truncate text-[20px] font-bold leading-[30px] tabular-nums md:text-[24px] md:leading-9 ${color}`}>{value}</div>
      {hint && <div className="text-[12px] leading-[18px] text-less">{hint}</div>}
    </div>
  )
}

function typeTone(type: string): BadgeTone {
  if (type === "deposit") return "success"
  if (type === "return") return "brand"
  if (type === "withdrawal") return "danger"
  return "neutral"
}

function typeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function TypeGlyph({ type }: { type: string }) {
  const inflow = type === "deposit"
  const isReturn = type === "return"
  const Glyph = inflow ? IconArrowDownLeft : isReturn ? IconTrendingUp : IconArrowUpRight
  const wrap = inflow ? "bg-success-soft text-success" : isReturn ? "bg-brand-soft text-brand" : "bg-danger-soft text-destructive"
  return (
    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${wrap}`}>
      <Glyph className="h-4 w-4" stroke={2} />
    </span>
  )
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

  const amountText = (tx: Transaction) => `${tx.type === 'withdrawal' ? '-' : '+'}$${tx.amount.toLocaleString()}`
  const amountColor = (tx: Transaction) => (tx.type === 'return' ? 'text-success' : tx.type === 'withdrawal' ? 'text-destructive' : 'text-foreground')

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-[16px]" />
        <Skeleton className="h-[420px] w-full rounded-[16px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="A complete record of deposits, returns and withdrawals across your account." />

      {/* Summary strip */}
      <Card className="grid grid-cols-2 divide-y divide-[var(--background-hover)] sm:divide-y-0 sm:divide-x lg:grid-cols-4 animate-fade-up">
        <SummaryCell label="Deposits" value={`$${stats.totalDeposits.toLocaleString()}`} hint="Net credited" />
        <SummaryCell label="Returns" value={`+$${stats.totalReturns.toLocaleString()}`} tone="success" hint="Paid out" />
        <SummaryCell label="Withdrawals" value={`-$${stats.totalWithdrawals.toLocaleString()}`} hint="Net sent" />
        <SummaryCell label="Fees paid" value={`-$${stats.totalFees.toLocaleString()}`} tone="muted" hint="All time" />
      </Card>

      {/* Statement */}
      <Card className="overflow-hidden animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between sm:pr-5">
          <Tabs items={FILTERS} value={filter} onChange={setFilter} className="tabs-fill-mobile" />
          <div className="relative px-3 pb-3 sm:px-0 sm:pb-0">
            <IconSearch className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-less sm:left-3" stroke={1.8} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID"
              aria-label="Search by transaction ID"
              className="field h-8 pl-9 sm:w-56"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconReceipt2 className="h-5 w-5" stroke={1.8} />}
            title="No transactions"
            description={transactions.length ? "Try adjusting your filters." : "Your deposits, returns and withdrawals will show up here."}
          />
        ) : (
          <>
            {/* Mobile: stacked rows */}
            <div className="divide-y divide-[var(--background-hover)] lg:hidden">
              {filtered.map((tx) => (
                <button key={tx.id} type="button" onClick={() => setSelectedTx(tx)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover">
                  <TypeGlyph type={tx.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-foreground">{typeLabel(tx.type)}</span>
                      <StatusPill tone={statusTone(tx.status)} className="capitalize">{tx.status}</StatusPill>
                    </div>
                    <div className="truncate text-[12px] leading-[18px] text-less">
                      {formatDate(tx.createdAt)} · {formatTime(tx.createdAt)} · <span className="font-mono">{tx.id.slice(0, 12)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[14px] font-bold tabular-nums ${amountColor(tx)}`}>{amountText(tx)}</div>
                    <div className="text-[12px] leading-[18px] tabular-nums text-less">Net ${tx.net.toLocaleString()}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="table-linear">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Net</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="cursor-pointer" onClick={() => setSelectedTx(tx)}>
                      <td><span className="font-mono text-[12px] text-less">{tx.id.slice(0, 12)}</span></td>
                      <td>
                        <div className="text-foreground">{formatDate(tx.createdAt)}</div>
                        <div className="text-[12px] leading-[18px] text-less">{formatTime(tx.createdAt)}</div>
                      </td>
                      <td><Badge tone={typeTone(tx.type)}>{typeLabel(tx.type)}</Badge></td>
                      <td className="text-right">
                        <div className={`font-bold tabular-nums ${amountColor(tx)}`}>{amountText(tx)}</div>
                        <div className="text-[12px] leading-[18px] text-less">{tx.currency}</div>
                      </td>
                      <td className="text-right font-bold tabular-nums text-foreground">${tx.net.toLocaleString()}</td>
                      <td><StatusPill tone={statusTone(tx.status)} className="capitalize">{tx.status}</StatusPill></td>
                      <td><div className="max-w-[220px] truncate text-[12px] text-less">{tx.note}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Transaction detail */}
      <Modal open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction details">
        {selectedTx && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TypeGlyph type={selectedTx.type} />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-bold leading-6 text-foreground">{typeLabel(selectedTx.type)}</div>
                <div className="text-[12px] leading-[18px] text-less">{formatDate(selectedTx.createdAt)} at {formatTime(selectedTx.createdAt)}</div>
              </div>
              <span className={`text-[20px] font-bold leading-[30px] tabular-nums ${amountColor(selectedTx)}`}>{amountText(selectedTx)}</span>
            </div>

            <dl className="divide-y divide-[var(--background-hover)]">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-less">Transaction ID</dt>
                <dd className="font-mono text-[12px] text-foreground">{selectedTx.id.slice(0, 16)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-less">Amount</dt>
                <dd className="font-bold tabular-nums text-foreground">${selectedTx.amount.toLocaleString()} {selectedTx.currency}</dd>
              </div>
              {selectedTx.type !== 'return' && (
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-less">Fee (16.5%)</dt>
                  <dd className="tabular-nums text-less">-${selectedTx.fee.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-less">Net received</dt>
                <dd className="font-bold tabular-nums text-foreground">${selectedTx.net.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-less">Status</dt>
                <dd><StatusPill tone={statusTone(selectedTx.status)} className="capitalize">{selectedTx.status}</StatusPill></dd>
              </div>
              {selectedTx.txHash && (
                <div className="py-2.5">
                  <dt className="mb-1 text-less">TX hash</dt>
                  <dd className="break-all font-mono text-[12px] leading-[18px] text-foreground">{selectedTx.txHash}</dd>
                </div>
              )}
              <div className="py-2.5">
                <dt className="mb-1 text-less">Note</dt>
                <dd className="text-foreground">{selectedTx.note}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
