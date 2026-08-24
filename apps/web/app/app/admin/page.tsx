"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, ButtonLink, Card, CardHeader, EmptyState, Stat, statusTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { cn } from "@workspace/ui/lib/utils"
import { IconChevronRight, IconCoins, IconInbox } from "@tabler/icons-react"
import { Skeleton, planAmount, poolLabel, timeAgo } from "./_components"

interface AdminStats {
  totalUsers: number
  pendingDeposits: number
  activeInvestments: number
  completedCycles: number
  totalDeposited: number
  totalPaidOut: number
  recentActivity: { id: string; userName: string; amount: number; pool: string; status: string; createdAt: string }[]
}

/** One linked cell of the summary strip. */
function SummaryCell({ label, value, href, tone, hint }: { label: string; value: React.ReactNode; href: string; tone?: "success" | "warning"; hint?: string }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground"
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3 px-4 py-4 transition-colors hover:bg-hover sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] leading-[18px] text-less">{label}</div>
        <div className={cn("mt-0.5 truncate text-[20px] font-bold leading-[30px] tabular-nums md:text-[24px] md:leading-9", color)}>{value}</div>
        {hint && <div className="text-[12px] leading-[18px] text-less">{hint}</div>}
      </div>
      <IconChevronRight className="h-4 w-4 flex-shrink-0 text-less transition-transform group-hover:translate-x-0.5" stroke={2} />
    </Link>
  )
}

export default function AdminDashboardPage() {
  const { data: stats, loading, refreshing } = useCachedFetch<AdminStats>("/api/admin/stats", { ttl: 60_000 })

  if (loading || !stats) return <Skeleton rows={4} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your platform"
        actions={
          <>
            {refreshing && <span className="text-[12px] text-less">Refreshing…</span>}
            <ButtonLink href="/app/admin/deposits" size="sm">
              Review deposits
            </ButtonLink>
          </>
        }
      />

      {/* Summary strip */}
      <Card className="grid grid-cols-2 divide-y divide-[var(--background-hover)] sm:divide-y-0 sm:divide-x lg:grid-cols-4 animate-fade-up">
        <SummaryCell label="Total users" value={stats.totalUsers} href="/app/admin/users" hint="Registered accounts" />
        <SummaryCell label="Pending deposits" value={stats.pendingDeposits} href="/app/admin/deposits" tone={stats.pendingDeposits ? "warning" : undefined} hint="Awaiting review" />
        <SummaryCell label="Active investments" value={stats.activeInvestments} href="/app/admin/investments" tone="success" hint="Open cycles" />
        <SummaryCell label="Completed cycles" value={stats.completedCycles} href="/app/admin/investments" hint="Paid out" />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Totals */}
        <Card className="p-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <CardHeader title="Money flow" description="All time, in USD" />
          <div className="mt-5 space-y-5">
            <Stat label="Total deposited" value={`$${stats.totalDeposited.toLocaleString()}`} hint="Approved deposits" />
            <Stat label="Total paid out" value={`$${stats.totalPaidOut.toLocaleString()}`} tone="success" hint="Completed cycle returns" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <ButtonLink href="/app/admin/transactions" variant="secondary" size="sm" block>
              Transactions
            </ButtonLink>
            <ButtonLink href="/app/admin/communications" variant="tertiary" size="sm" block>
              Email users
            </ButtonLink>
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="overflow-hidden lg:col-span-2 animate-fade-up" style={{ animationDelay: "140ms" }}>
          <CardHeader
            className="px-5 pt-5"
            title="Recent deposit requests"
            description="Latest submissions across all investors"
            action={
              <Link href="/app/admin/deposits" className="text-[12px] font-bold text-brand hover:underline">
                View all
              </Link>
            }
          />
          {stats.recentActivity.length === 0 ? (
            <EmptyState icon={<IconInbox className="h-5 w-5" stroke={1.8} />} title="No deposit requests yet" description="New submissions from investors will show up here." />
          ) : (
            <div className="mt-3 divide-y divide-[var(--background-hover)]">
              {stats.recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-active text-[12px] font-bold text-foreground">
                    {a.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] leading-5 text-foreground">
                      <span className="font-bold">{a.userName}</span>
                      <span className="text-less"> · </span>
                      <span className="tabular-nums">{planAmount(a.amount, a.pool)}</span>
                      <span className="text-less"> · {poolLabel(a.pool, true)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[12px] leading-[18px] text-less">
                      <IconCoins className="h-3.5 w-3.5" stroke={1.8} />
                      {timeAgo(a.createdAt)}
                    </div>
                  </div>
                  <Badge tone={statusTone(a.status)} className="capitalize">
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
