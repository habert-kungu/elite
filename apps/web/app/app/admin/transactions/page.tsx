"use client"

import * as React from "react"
import { Card, StatusPill, statusTone } from "@/components/ui"
import { Pagination } from "@/components/data-table"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { PageHeader, StatGrid, FilterBar, Skeleton, InvestorLink, KV, formatDate } from "../_components"

const PAGE_SIZE = 12
type Filter = "all" | "deposit" | "investment" | "return" | "withdrawal"

interface Tx {
  id: string
  userId: string
  user: string
  userEmail: string
  type: string
  amount: number
  fee: number
  net: number
  status: string
  note: string | null
  createdAt: string
}
interface TxResponse {
  transactions: Tx[]
  total: number
  page: number
  pageCount: number
  stats: { deposits: number; returns: number; withdrawals: number }
}

const TYPE_STYLE: Record<string, string> = {
  deposit: "bg-[var(--bg-success)] text-[var(--color-success)]",
  investment: "bg-[var(--bg-success)] text-[var(--color-success)]",
  return: "bg-[var(--bg-info)] text-[var(--color-info)]",
  withdrawal: "bg-[var(--bg-danger)] text-destructive",
}

export default function TransactionsPage() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [page, setPage] = React.useState(1)
  const key = `/api/admin/transactions?page=${page}&pageSize=${PAGE_SIZE}&type=${filter}`
  const { data, loading, refreshing } = useCachedFetch<TxResponse>(key, { ttl: 60_000 })

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  if (loading || !data) return <Skeleton rows={6} />

  const start = (data.page - 1) * PAGE_SIZE
  const end = Math.min(data.page * PAGE_SIZE, data.total)

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Transactions" subtitle="All platform transactions" right={refreshing ? <span className="text-[11px] text-muted-foreground">Refreshing…</span> : undefined} />

      <StatGrid
        items={[
          { label: "Deposits", value: `$${data.stats.deposits.toLocaleString()}` },
          { label: "Returns", value: `+$${data.stats.returns.toLocaleString()}`, className: "text-[var(--color-success)]" },
          { label: "Withdrawn", value: `-$${data.stats.withdrawals.toLocaleString()}`, className: "text-destructive" },
        ]}
      />

      <FilterBar
        value={filter}
        onChange={changeFilter}
        options={[
          { key: "all", label: "All" },
          { key: "investment", label: "Investments" },
          { key: "deposit", label: "Deposits" },
          { key: "return", label: "Returns" },
          { key: "withdrawal", label: "Withdrawals" },
        ]}
      />

      {/* Mobile: cards */}
      <div className="space-y-2 sm:hidden">
        {data.transactions.map((tx) => (
          <Card key={tx.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <InvestorLink id={tx.userId} name={tx.user} email={tx.userEmail} />
              <div className={`text-sm font-medium tabular-nums ${tx.type === "return" ? "text-[var(--color-success)]" : "text-foreground"}`}>
                {tx.type === "return" ? "+" : tx.type === "withdrawal" ? "-" : ""}${tx.amount.toLocaleString()}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${TYPE_STYLE[tx.type] || "bg-secondary text-foreground"}`}>{tx.type}</span>
              <StatusPill tone={statusTone(tx.status)} className="capitalize">{tx.status}</StatusPill>
              <span className="text-[10px] text-muted-foreground">{formatDate(tx.createdAt)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <KV label="Fee">{tx.fee > 0 ? `-$${tx.fee.toLocaleString()}` : "—"}</KV>
              <KV label="Net">${tx.net.toLocaleString()}</KV>
            </div>
            {tx.note && <div className="mt-1.5 text-[11px] text-muted-foreground">{tx.note}</div>}
          </Card>
        ))}
        {data.transactions.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No transactions found</Card>}
      </div>

      <Card className="hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">User</th>
                <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Type</th>
                <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Amount</th>
                <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Fee</th>
                <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Net</th>
                <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-secondary/30">
                  <td className="px-3 py-2.5">
                    <InvestorLink id={tx.userId} name={tx.user} email={tx.userEmail} size="sm" />
                    {tx.note && <div className="ml-8 max-w-[220px] truncate text-[10px] text-muted-foreground">{tx.note}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${TYPE_STYLE[tx.type] || "bg-secondary text-foreground"}`}>{tx.type}</span>
                  </td>
                  <td className={`px-3 py-2.5 text-right text-xs font-medium tabular-nums ${tx.type === "return" ? "text-[var(--color-success)]" : "text-foreground"}`}>
                    {tx.type === "return" ? "+" : tx.type === "withdrawal" ? "-" : ""}${tx.amount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{tx.fee > 0 ? `-$${tx.fee.toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-foreground">${tx.net.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={statusTone(tx.status)} className="capitalize">{tx.status}</StatusPill>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-muted-foreground">{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
              {data.transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />
    </div>
  )
}
