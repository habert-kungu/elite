"use client"

import * as React from "react"
import { Card, StatusPill, statusTone } from "@/components/ui"
import { Pagination } from "@/components/data-table"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { PageHeader, StatGrid, FilterBar, Skeleton, ActionMenu, InvestorLink, KV, formatDate } from "../_components"
import { AdjustInvestmentModal, type AdminInvestment } from "../_adjust-modal"

const PAGE_SIZE = 10
type Filter = "all" | "active" | "completed" | "pending" | "rejected"

interface InvResponse {
  investments: AdminInvestment[]
  total: number
  page: number
  pageCount: number
  stats: { all: number; pending: number; active: number; completed: number; rejected: number }
}

function Progress({ cycle }: { cycle: AdminInvestment["cycle"] }) {
  if (!cycle) return <span className="text-[10px] text-muted-foreground">—</span>
  return (
    <div className="min-w-[90px]">
      <div className="mb-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>${Math.round(cycle.currentValue).toLocaleString()}</span>
        <span>{Math.round(cycle.progress)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${Math.min(100, cycle.progress)}%` }} />
      </div>
    </div>
  )
}

export default function InvestmentsPage() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [page, setPage] = React.useState(1)
  const key = `/api/admin/investments?page=${page}&pageSize=${PAGE_SIZE}&status=${filter}`
  const { data, loading, refreshing, refresh } = useCachedFetch<InvResponse>(key, { ttl: 60_000 })
  const [editing, setEditing] = React.useState<AdminInvestment | null>(null)
  const [notice, setNotice] = React.useState("")

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  if (loading || !data) return <Skeleton rows={5} />

  const start = (data.page - 1) * PAGE_SIZE
  const end = Math.min(data.page * PAGE_SIZE, data.total)
  const menuFor = (inv: AdminInvestment) => [
    { label: "Adjust plan", onClick: () => setEditing(inv) },
    { label: "View investor", href: `/app/admin/users/${inv.userId}` },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Investments"
        subtitle="Track all investment cycles"
        right={
          <span className="text-xs text-muted-foreground">
            {refreshing && <span className="mr-2 text-[11px]">Refreshing…</span>}
            Active: <span className="text-sm font-medium text-[var(--color-success)]">{data.stats.active}</span>
          </span>
        }
      />

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-success)]/25 bg-[var(--bg-success)] p-3 text-xs text-foreground">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">✕</button>
        </div>
      )}

      <StatGrid
        items={[
          { label: "Active", value: data.stats.active, className: "text-[var(--color-success)]" },
          { label: "Completed", value: data.stats.completed },
          { label: "Total", value: data.stats.all },
        ]}
      />

      <FilterBar
        value={filter}
        onChange={changeFilter}
        options={[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "completed", label: "Completed" },
          { key: "pending", label: "Pending" },
          { key: "rejected", label: "Rejected" },
        ]}
      />

      {/* Mobile: cards */}
      <div className="space-y-2 sm:hidden">
        {data.investments.map((inv) => (
          <Card key={inv.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <InvestorLink id={inv.userId} name={inv.userName} email={inv.userEmail} />
              <ActionMenu items={menuFor(inv)} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-foreground">{inv.pool === "daily" ? "48H" : "Weekly"} · {inv.roi}x</span>
              <StatusPill tone={statusTone(inv.status)} className="capitalize">{inv.status}</StatusPill>
              <span className="text-[10px] text-muted-foreground">{formatDate(inv.createdAt)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <KV label="Amount">${inv.amount.toLocaleString()}</KV>
              <KV label="Target"><span className="text-[var(--color-success)]">${Math.round(inv.amount * inv.roi).toLocaleString()}</span></KV>
            </div>
            {inv.cycle && <div className="mt-2"><Progress cycle={inv.cycle} /></div>}
          </Card>
        ))}
        {data.investments.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No investments found</Card>}
      </div>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden sm:block">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Investor</th>
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Pool</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Amount</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Target</th>
              <th className="hidden px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground md:table-cell">Progress</th>
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Status</th>
              <th className="hidden px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground lg:table-cell">Started</th>
              <th className="w-12 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.investments.map((inv) => (
              <tr key={inv.id} className="hover:bg-secondary/30">
                <td className="px-3 py-2.5"><InvestorLink id={inv.userId} name={inv.userName} email={inv.userEmail} size="sm" /></td>
                <td className="px-3 py-2.5 text-xs text-foreground">{inv.pool === "daily" ? "48H" : "Weekly"} <span className="text-[10px] text-muted-foreground">· {inv.roi}x</span></td>
                <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-foreground">${inv.amount.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-[var(--color-success)]">${Math.round(inv.amount * inv.roi).toLocaleString()}</td>
                <td className="hidden px-3 py-2.5 md:table-cell"><Progress cycle={inv.cycle} /></td>
                <td className="px-3 py-2.5"><StatusPill tone={statusTone(inv.status)} className="capitalize">{inv.status}</StatusPill></td>
                <td className="hidden px-3 py-2.5 text-[10px] text-muted-foreground lg:table-cell">{formatDate(inv.createdAt)}</td>
                <td className="px-2 py-2.5 text-right"><ActionMenu items={menuFor(inv)} /></td>
              </tr>
            ))}
            {data.investments.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">No investments found</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />

      <AdjustInvestmentModal investment={editing} onClose={() => setEditing(null)} onSaved={async (summary) => { setNotice(summary); await refresh() }} />
    </div>
  )
}
