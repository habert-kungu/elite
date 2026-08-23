"use client"

import * as React from "react"
import Link from "next/link"
import { Card, StatusPill, statusTone } from "@/components/ui"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { PageHeader, Skeleton, timeAgo } from "./_components"

interface AdminStats {
  totalUsers: number
  pendingDeposits: number
  activeInvestments: number
  completedCycles: number
  totalDeposited: number
  totalPaidOut: number
  recentActivity: { id: string; userName: string; amount: number; pool: string; status: string; createdAt: string }[]
}

const ICONS: Record<string, string> = {
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87",
  pending: "M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  active: "M23 6l-9.5 9.5-5-5L1 18",
  done: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
}

export default function AdminDashboardPage() {
  const { data: stats, loading, refreshing } = useCachedFetch<AdminStats>("/api/admin/stats", { ttl: 60_000 })

  if (loading || !stats) return <Skeleton rows={4} />

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: "users", href: "/app/admin/users" },
    { label: "Pending Deposits", value: stats.pendingDeposits, icon: "pending", href: "/app/admin/deposits", color: "text-[var(--color-warning)]" },
    { label: "Active Investments", value: stats.activeInvestments, icon: "active", href: "/app/admin/investments", color: "text-[var(--color-success)]" },
    { label: "Completed Cycles", value: stats.completedCycles, icon: "done", href: "/app/admin/investments" },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your platform"
        right={refreshing ? <span className="text-[11px] text-muted-foreground">Refreshing…</span> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-4 transition-colors hover:bg-secondary/40">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[stat.icon]} /></svg>
              </div>
              <div className="mb-1 font-mono text-[11px] uppercase text-muted-foreground">{stat.label}</div>
              <div className={`text-xl font-medium tabular-nums sm:text-2xl ${stat.color || "text-foreground"}`}>{stat.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="mb-1 font-mono text-[11px] uppercase text-muted-foreground">Total Deposited</div>
          <div className="text-xl font-medium tabular-nums text-foreground sm:text-2xl">${stats.totalDeposited.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-1 font-mono text-[11px] uppercase text-muted-foreground">Total Paid Out</div>
          <div className="text-xl font-medium tabular-nums text-[var(--color-success)] sm:text-2xl">${stats.totalPaidOut.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h3 className="text-sm font-medium text-foreground sm:text-base">Recent Activity</h3>
          <Link href="/app/admin/deposits" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No deposit requests yet</p>
        ) : (
          <div className="divide-y divide-border/50">
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-foreground">
                    {a.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs text-foreground sm:text-sm">
                      <span className="font-medium">{a.userName}</span> · ${a.amount.toLocaleString()} {a.pool === "daily" ? "48H" : "Weekly"} Pool
                    </div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
                <StatusPill tone={statusTone(a.status)} className="capitalize">{a.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
