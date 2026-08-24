"use client"

import * as React from "react"
import { Badge, Button, Card, EmptyState, statusTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { Pagination } from "@/components/data-table"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { IconInbox } from "@tabler/icons-react"
import { FilterBar, InvestorLink, KV, Skeleton, StatGrid, planAmount, poolLabel } from "../_components"

const PAGE_SIZE = 10

interface Investment {
  id: string
  userId: string
  userName: string
  userEmail: string
  userTelegram: string | null
  amount: number
  pool: string
  roi: number
  txHash: string | null
  network: string
  status: string
  createdAt: string
}

interface Stats { all: number; pending: number; active: number; completed: number; rejected: number }

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
]

export default function DepositsPage() {
  const [filter, setFilter] = React.useState("pending")
  const [processing, setProcessing] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const key = `/api/admin/investments?page=${page}&pageSize=${PAGE_SIZE}&status=${filter}`
  const { data, loading, refresh } = useCachedFetch<{ investments: Investment[]; total: number; pageCount: number; stats: Stats }>(key, { ttl: 30_000 })
  const investments = data?.investments ?? []
  const total = data?.total ?? 0
  const pageCount = data?.pageCount ?? 1
  const stats: Stats = data?.stats ?? { all: 0, pending: 0, active: 0, completed: 0, rejected: 0 }

  // Approve/reject changes counts everywhere — drop every cached admin list.
  const fetchInvestments = React.useCallback(async () => {
    invalidateCache("/api/admin/")
    await refresh()
  }, [refresh])

  const changeFilter = (f: string) => {
    setFilter(f)
    setPage(1)
  }

  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/investments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentId: id, action: 'approve' }),
      })

      if (res.ok) {
        await fetchInvestments()
      }
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/investments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentId: id, action: 'reject' }),
      })

      if (res.ok) {
        await fetchInvestments()
      }
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setProcessing(null)
    }
  }

  // Server returns the current page; stats/counts are aggregate (all rows).
  const pageItems = investments
  const pendingCount = stats.pending
  const activeCount = stats.active
  const start = (page - 1) * PAGE_SIZE
  const end = Math.min(page * PAGE_SIZE, total)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading || !data) return <Skeleton rows={5} />

  const networkLabel = (n: string) => (n === 'BTC' ? 'BTC' : 'USDT TRC20')
  const shortHash = (h: string) => (h.length > 18 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h)

  const decisionButtons = (deposit: Investment) => (
    <div className="flex items-center gap-2">
      <Button variant="success" size="sm" onClick={() => handleApprove(deposit.id)} disabled={processing === deposit.id} loading={processing === deposit.id}>
        Approve
      </Button>
      <Button variant="danger" size="sm" onClick={() => handleReject(deposit.id)} disabled={processing === deposit.id}>
        Reject
      </Button>
    </div>
  )

  const empty = (
    <EmptyState
      icon={<IconInbox className="h-5 w-5" stroke={1.8} />}
      title="No deposits found"
      description={filter === "pending" ? "Nothing is waiting for review right now." : "Try another filter."}
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposits"
        description="Approve or reject deposit requests"
        actions={
          <Badge tone={pendingCount ? "warning" : "neutral"} dot>
            {pendingCount} pending
          </Badge>
        }
      />

      <StatGrid
        items={[
          { label: "Pending", value: pendingCount, className: pendingCount ? "text-warning" : undefined },
          { label: "Active", value: activeCount, className: "text-success" },
          { label: "Total", value: stats.all },
        ]}
      />

      <FilterBar value={filter} onChange={changeFilter} options={FILTERS} />

      {/* Mobile: stacked rows */}
      <Card className="overflow-hidden sm:hidden">
        {pageItems.length === 0 ? (
          empty
        ) : (
          <div className="divide-y divide-[var(--background-hover)]">
            {pageItems.map((deposit) => (
              <div key={deposit.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <InvestorLink id={deposit.userId} name={deposit.userName} email={deposit.userEmail} />
                  <Badge tone={statusTone(deposit.status)} className="capitalize">
                    {deposit.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <KV label="Amount">{planAmount(deposit.amount, deposit.pool)}</KV>
                  <KV label="Plan">{poolLabel(deposit.pool, true)} · {deposit.roi}x</KV>
                  <KV label="Network">{networkLabel(deposit.network)}</KV>
                  <KV label="Submitted">{formatDate(deposit.createdAt)}</KV>
                  {deposit.userTelegram && <KV label="Telegram">{deposit.userTelegram}</KV>}
                </div>
                {deposit.txHash && (
                  <div className="break-all font-mono text-[12px] leading-[18px] text-less" title={deposit.txHash}>
                    TX {deposit.txHash}
                  </div>
                )}
                {deposit.status === "pending" && decisionButtons(deposit)}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden sm:block">
        {pageItems.length === 0 ? (
          empty
        ) : (
          <div className="overflow-x-auto">
            <table className="table-linear min-w-[720px]">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Plan</th>
                  <th className="text-right">Amount</th>
                  <th className="hidden lg:table-cell">Reference</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((deposit) => (
                  <tr key={deposit.id}>
                    <td>
                      <InvestorLink id={deposit.userId} name={deposit.userName} email={deposit.userEmail} size="sm" />
                    </td>
                    <td>
                      <div className="text-foreground">
                        {poolLabel(deposit.pool, true)} <span className="text-less">· {deposit.roi}x</span>
                      </div>
                      <div className="text-[12px] leading-[18px] text-less">{networkLabel(deposit.network)}</div>
                    </td>
                    <td className="text-right font-bold tabular-nums text-foreground">{planAmount(deposit.amount, deposit.pool)}</td>
                    <td className="hidden lg:table-cell">
                      {deposit.txHash ? (
                        <span className="font-mono text-[12px] text-less" title={deposit.txHash}>
                          {shortHash(deposit.txHash)}
                        </span>
                      ) : (
                        <span className="text-less">—</span>
                      )}
                      {deposit.userTelegram && <div className="text-[12px] leading-[18px] text-less">TG {deposit.userTelegram}</div>}
                    </td>
                    <td className="text-[12px] text-less">{formatDate(deposit.createdAt)}</td>
                    <td>
                      <Badge tone={statusTone(deposit.status)} className="capitalize">
                        {deposit.status}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {deposit.status === "pending" ? (
                        <div className="flex justify-end">
                          {decisionButtons(deposit)}
                        </div>
                      ) : (
                        <span className="text-[12px] text-less">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} total={total} start={start} end={end} className="mt-4" />
    </div>
  )
}
