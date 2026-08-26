"use client"

import * as React from "react"
import { Badge, Button, Card, EmptyState, Notice, TextField, statusTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { Pagination } from "@/components/data-table"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { cn } from "@workspace/ui/lib/utils"
import { IconReceipt2 } from "@tabler/icons-react"
import { FilterBar, InvestorLink, KV, Modal, Skeleton, StatGrid, formatDate, txTypeTone } from "../_components"

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
  const { data, loading, refreshing, refresh } = useCachedFetch<TxResponse>(key, { ttl: 60_000 })

  const [settling, setSettling] = React.useState<{ tx: Tx; action: "completed" | "rejected" } | null>(null)
  const [txHash, setTxHash] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [notice, setNotice] = React.useState("")

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  /** A pending withdrawal is holding the investor's funds until it is settled. */
  const isPendingWithdrawal = (tx: Tx) => tx.type === "withdrawal" && tx.status !== "completed" && tx.status !== "rejected"

  const settle = async () => {
    if (!settling) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/transactions/${settling.tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: settling.action, txHash }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Couldn't settle this withdrawal")
        return
      }
      setNotice(
        settling.action === "completed"
          ? `Marked $${settling.tx.amount.toLocaleString()} as paid to ${settling.tx.user}.`
          : `Rejected $${settling.tx.amount.toLocaleString()} — the amount is back in ${settling.tx.user}'s balance.`
      )
      setSettling(null)
      setTxHash("")
      invalidateCache("/api/admin/")
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const settleButtons = (tx: Tx) =>
    isPendingWithdrawal(tx) ? (
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={() => { setError(""); setTxHash(""); setSettling({ tx, action: "completed" }) }}>
          Mark paid
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setError(""); setTxHash(""); setSettling({ tx, action: "rejected" }) }}>
          Reject
        </Button>
      </div>
    ) : null

  if (loading || !data) return <Skeleton rows={6} />

  const start = (data.page - 1) * PAGE_SIZE
  const end = Math.min(data.page * PAGE_SIZE, data.total)

  const empty = <EmptyState icon={<IconReceipt2 className="h-5 w-5" stroke={1.8} />} title="No transactions found" description="Nothing matches this filter yet." />

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="All platform transactions" actions={refreshing ? <span className="text-[12px] text-less">Refreshing…</span> : undefined} />

      {notice && (
        <Notice tone="success">
          <span className="flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="text-less hover:text-foreground" aria-label="Dismiss">✕</button>
          </span>
        </Notice>
      )}

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
                {settleButtons(tx)}
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
                  <th className="text-right">Actions</th>
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
                    <td><div className="flex justify-end">{settleButtons(tx)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />

      {/* Settle a withdrawal */}
      <Modal
        open={!!settling}
        onClose={() => !busy && setSettling(null)}
        title={settling?.action === "rejected" ? "Reject withdrawal" : "Mark withdrawal paid"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettling(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={settling?.action === "rejected" ? "danger" : "primary"} onClick={settle} loading={busy} disabled={busy}>
              {settling?.action === "rejected" ? "Reject withdrawal" : "Mark as paid"}
            </Button>
          </>
        }
      >
        {settling && (
          <div className="space-y-4">
            {error && <Notice tone="danger">{error}</Notice>}
            <p className="text-[14px] leading-[22px] text-general">
              {settling.action === "rejected" ? (
                <>Reject <strong className="font-bold text-foreground">{settling.tx.user}</strong>&apos;s ${settling.tx.amount.toLocaleString()} withdrawal? The amount goes back into their withdrawable balance and they&apos;ll be emailed.</>
              ) : (
                <>Confirm you have sent <strong className="font-bold text-foreground">${settling.tx.amount.toLocaleString()}</strong> to {settling.tx.user}. They&apos;ll be emailed the payout confirmation.</>
              )}
            </p>
            {settling.tx.note && (
              <p className="rounded-[8px] bg-background p-3 text-[12px] leading-[18px] break-all text-less">{settling.tx.note}</p>
            )}
            {settling.action === "completed" && (
              <TextField
                label="Payout transaction hash"
                name="txHash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x… / T…"
                inputClassName="font-mono text-[12px]"
                help="Optional — included in the confirmation email."
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
