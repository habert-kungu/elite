"use client"

import * as React from "react"
import { Badge, Card, EmptyState, Notice, statusTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { Pagination } from "@/components/data-table"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { IconChartBar, IconCircleCheck, IconX } from "@tabler/icons-react"
import { ActionMenu, FilterBar, InvestorLink, KV, ProgressBar, Skeleton, StatGrid, formatDate, planAmount, poolLabel } from "../_components"
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

function Progress({ cycle, pool }: { cycle: AdminInvestment["cycle"]; pool: string }) {
  if (!cycle) return <span className="text-[12px] text-less">—</span>
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 flex justify-between text-[12px] leading-[18px] tabular-nums text-less">
        <span>{planAmount(cycle.currentValue, pool)}</span>
        <span>{Math.round(cycle.progress)}%</span>
      </div>
      <ProgressBar value={cycle.progress} />
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

  const empty = <EmptyState icon={<IconChartBar className="h-5 w-5" stroke={1.8} />} title="No investments found" description="Nothing matches this filter yet." />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        description="Track all investment cycles"
        actions={
          <>
            {refreshing && <span className="text-[12px] text-less">Refreshing…</span>}
            <Badge tone="success" dot>
              {data.stats.active} active
            </Badge>
          </>
        }
      />

      {notice && (
        <Notice tone="success" icon={<IconCircleCheck className="h-4 w-4" stroke={1.8} />}>
          <div className="flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="-mr-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] text-less hover:bg-hover hover:text-foreground" aria-label="Dismiss">
              <IconX className="h-4 w-4" stroke={2} />
            </button>
          </div>
        </Notice>
      )}

      <StatGrid
        items={[
          { label: "Active", value: data.stats.active, className: "text-success" },
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

      {/* Mobile: stacked rows */}
      <Card className="overflow-hidden sm:hidden">
        {data.investments.length === 0 ? (
          empty
        ) : (
          <div className="divide-y divide-[var(--background-hover)]">
            {data.investments.map((inv) => (
              <div key={inv.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <InvestorLink id={inv.userId} name={inv.userName} email={inv.userEmail} />
                  <ActionMenu items={menuFor(inv)} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold text-foreground">
                    {poolLabel(inv.pool, true)} · {inv.roi}x
                  </span>
                  <Badge tone={statusTone(inv.status)} className="capitalize">
                    {inv.status}
                  </Badge>
                  <span className="text-[12px] text-less">{formatDate(inv.createdAt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <KV label="Amount">{planAmount(inv.amount, inv.pool)}</KV>
                  <KV label="Target">
                    <span className="text-success">{planAmount(inv.amount * inv.roi, inv.pool)}</span>
                  </KV>
                </div>
                {inv.cycle && <Progress cycle={inv.cycle} pool={inv.pool} />}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden sm:block">
        {data.investments.length === 0 ? (
          empty
        ) : (
          <div className="overflow-x-auto">
            <table className="table-linear min-w-[720px]">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Plan</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Target</th>
                  <th className="hidden md:table-cell">Progress</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Started</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {data.investments.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <InvestorLink id={inv.userId} name={inv.userName} email={inv.userEmail} size="sm" />
                    </td>
                    <td className="text-foreground">
                      {poolLabel(inv.pool, true)} <span className="text-less">· {inv.roi}x</span>
                    </td>
                    <td className="text-right font-bold tabular-nums text-foreground">{planAmount(inv.amount, inv.pool)}</td>
                    <td className="text-right font-bold tabular-nums text-success">{planAmount(inv.amount * inv.roi, inv.pool)}</td>
                    <td className="hidden md:table-cell">
                      <Progress cycle={inv.cycle} pool={inv.pool} />
                    </td>
                    <td>
                      <Badge tone={statusTone(inv.status)} className="capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="hidden text-[12px] text-less lg:table-cell">{formatDate(inv.createdAt)}</td>
                    <td className="text-right">
                      <ActionMenu items={menuFor(inv)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />

      <AdjustInvestmentModal investment={editing} onClose={() => setEditing(null)} onSaved={async (summary) => { setNotice(summary); await refresh() }} />
    </div>
  )
}
