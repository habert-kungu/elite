"use client"


import Link from "next/link"
import { Card, StatusPill, statusTone } from "@/components/ui"
import { Pagination } from "@/components/data-table"
import * as React from "react"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"

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

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => (
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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Deposits</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Approve or reject deposit requests</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pending:</span>
          <span className="text-sm font-bold text-amber-500">{pendingCount}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-amber-500">{pendingCount}</div>
          <div className="text-[10px] text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-emerald-500">{activeCount}</div>
          <div className="text-[10px] text-muted-foreground">Active</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-foreground">{stats.all}</div>
          <div className="text-[10px] text-muted-foreground">Total</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "pending", label: "Pending" },
            { key: "active", label: "Active" },
            { key: "rejected", label: "Rejected" },
            { key: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Deposits List */}
      <div className="space-y-3">
        {pageItems.map((deposit) => (
          <Card key={deposit.id} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[oklch(0.62_0.12_178)/10] flex items-center justify-center text-sm font-bold text-primary">
                  {deposit.userName?.charAt(0).toUpperCase() || deposit.userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/app/admin/users/${deposit.userId}`} className="text-sm font-medium text-foreground hover:underline">{deposit.userName || deposit.userEmail}</Link>
                    <StatusPill tone={statusTone(deposit.status)} className="capitalize">{deposit.status}</StatusPill>
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">{deposit.userEmail}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <div className="text-base font-medium text-foreground">${deposit.amount.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{deposit.pool === 'daily' ? '48H Pool' : 'Weekly Pool'} • {deposit.roi}x • {deposit.network === 'BTC' ? 'BTC' : 'USDT TRC20'} • {formatDate(deposit.createdAt)}</div>
                </div>
                
                {deposit.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(deposit.id)}
                      disabled={processing === deposit.id}
                      className="px-3 py-1.5 text-xs font-medium bg-[var(--color-success)] text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                      {processing === deposit.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(deposit.id)}
                      disabled={processing === deposit.id}
                      className="px-3 py-1.5 text-xs font-medium border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {processing === deposit.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {deposit.txHash && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-[10px] text-muted-foreground">
                  <span className="font-mono">TX: {deposit.txHash}</span>
                  {deposit.userTelegram && <span className="ml-2">• TG: {deposit.userTelegram}</span>}
                </div>
              </div>
            )}
          </Card>
        ))}
        
        {pageItems.length === 0 && (
          <Card className="p-8 text-center">
            <div className="text-sm text-muted-foreground">No deposits found</div>
          </Card>
        )}
      </div>

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} total={total} start={start} end={end} className="mt-4" />
    </div>
  )
}