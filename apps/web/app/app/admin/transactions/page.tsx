"use client"

import * as React from "react"
import { Badge, Card, EmptyState, statusTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { Pagination } from "@/components/data-table"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { cn } from "@workspace/ui/lib/utils"
import { IconReceipt2 } from "@tabler/icons-react"
import { FilterBar, InvestorLink, KV, Skeleton, StatGrid, formatDate, txTypeTone } from "../_components"

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

function signedAmount(tx: Tx) {
  return `${tx.type === "return" ? "+" : tx.type === "withdrawal" ? "-" : ""}$${tx.amount.toLocaleString()}`
}

function amountColor(tx: Tx) {
  return tx.type === "return" ? "text-success" : tx.type === "withdrawal" ? "text-destructive" : "text-foreground"
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

  const empty = <EmptyState icon={<IconReceipt2 className="h-5 w-5" stroke={1.8} />} title="No transactions found" description="Nothing matches this filter yet." />

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="All platform transactions" actions={refreshing ? <span className="text-[12px] text-less">Refreshing…</span> : undefined} />

      <StatGrid
        items={[
          { label: "Deposits", value: `$${data.stats.deposits.toLocaleString()}` },
          { label: "Returns", value: `+$${data.stats.returns.toLocaleString()}`, className: "text-success" },
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

      {/* Mobile: stacked rows */}
      <Card className="overflow-hidden sm:hidden">
        {data.transactions.length === 0 ? (
          empty
        ) : (
          <div className="divide-y divide-[var(--background-hover)]">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <InvestorLink id={tx.userId} name={tx.user} email={tx.userEmail} />
                  <span className={cn("flex-shrink-0 text-[14px] font-bold tabular-nums", amountColor(tx))}>{signedAmount(tx)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={txTypeTone(tx.type)} className="capitalize">
                    {tx.type}
                  </Badge>
                  <Badge tone={statusTone(tx.status)} className="capitalize">
                    {tx.status}
                  </Badge>
                  <span className="text-[12px] text-less">{formatDate(tx.createdAt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <KV label="Fee">{tx.fee > 0 ? `-$${tx.fee.toLocaleString()}` : "—"}</KV>
                  <KV label="Net">${tx.net.toLocaleString()}</KV>
                </div>
                {tx.note && <div className="text-[12px] leading-[18px] text-less">{tx.note}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden sm:block">
        {data.transactions.length === 0 ? (
          empty
        ) : (
          <div className="overflow-x-auto">
            <table className="table-linear min-w-[680px]">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Fee</th>
                  <th className="text-right">Net</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <InvestorLink id={tx.userId} name={tx.user} email={tx.userEmail} size="sm" />
                      {tx.note && <div className="ml-10 max-w-[240px] truncate text-[12px] leading-[18px] text-less">{tx.note}</div>}
                    </td>
                    <td>
                      <Badge tone={txTypeTone(tx.type)} className="capitalize">
                        {tx.type}
                      </Badge>
                    </td>
                    <td className={cn("text-right font-bold tabular-nums", amountColor(tx))}>{signedAmount(tx)}</td>
                    <td className="text-right tabular-nums text-less">{tx.fee > 0 ? `-$${tx.fee.toLocaleString()}` : "—"}</td>
                    <td className="text-right font-bold tabular-nums text-foreground">${tx.net.toLocaleString()}</td>
                    <td>
                      <Badge tone={statusTone(tx.status)} className="capitalize">
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="text-[12px] text-less">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />
    </div>
  )
}
