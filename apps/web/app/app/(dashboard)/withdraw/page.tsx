"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, Button, Card, CardHeader, Modal, Segmented, Stat, statusTone, TextField } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { IconArrowUpRight, IconClockHour4 } from "@tabler/icons-react"

const AVAILABLE_BALANCE = 4250.0

const NETWORKS = ["TRC20", "ERC20", "BEP20"].map((n) => ({ value: n, label: n }))

/** Recent withdrawals come from the cached transactions feed the Reports page uses. */
interface Transaction {
  id: string
  type: string
  amount: number
  net: number
  status: string
  createdAt: string
}

function money(n: number) {
  return n.toLocaleString()
}

export default function WithdrawPage() {
  const { user } = useAuth()
  const { data: txData } = useCachedFetch<{ transactions: Transaction[] }>(user ? "/api/user/transactions" : null, { ttl: 60_000 })
  const recentWithdrawals = React.useMemo(() => (txData?.transactions ?? []).filter((t) => t.type === "withdrawal").slice(0, 5), [txData])

  const [amount, setAmount] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [network, setNetwork] = React.useState("TRC20")
  const [showConfirm, setShowConfirm] = React.useState(false)

  const withdrawAmount = amount ? parseFloat(amount) : 0
  const fee = withdrawAmount * 0.165
  const receiveAmount = withdrawAmount - fee

  const handleSubmit = () => {
    const message = `💰 *Withdrawal Request*\n\n*Amount:* $${withdrawAmount}\n*Fee (16.5%):* $${fee.toFixed(2)}\n*Net:* $${receiveAmount.toFixed(2)}\n*Network:* ${network}\n*Address:* ${address}`
    const telegramUrl = `https://t.me/Patrick_vile?text=${encodeURIComponent(message)}`
    window.open(telegramUrl, "_blank")
    setShowConfirm(false)
    setAmount("")
    setAddress("")
  }

  const isValid =
    withdrawAmount >= 50 &&
    withdrawAmount <= AVAILABLE_BALANCE &&
    address.length > 0

  const amountError =
    withdrawAmount > 0 && withdrawAmount < 50
      ? "Minimum withdrawal is $50"
      : withdrawAmount > AVAILABLE_BALANCE
        ? "Amount exceeds your available balance"
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
            <Stat className="px-4 py-3" label="Available balance" value={`$${money(AVAILABLE_BALANCE)}`} hint="USDT" />
            <Stat className="px-4 py-3" label="You receive" value={`$${money(receiveAmount)}`} tone={withdrawAmount > 0 ? "success" : undefined} hint="After 16.5% fee" />
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
                <button type="button" onClick={() => setAmount(AVAILABLE_BALANCE.toString())} className="pointer-events-auto text-[12px] font-bold text-brand hover:underline">
                  Max
                </button>
              }
              error={amountError}
              help={`Minimum $50 · up to $${money(AVAILABLE_BALANCE)}`}
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
                  <dt className="text-less">Fee (16.5%)</dt>
                  <dd className="tabular-nums text-less">-${money(fee)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                  <dt className="font-bold text-foreground">You receive</dt>
                  <dd className="font-bold tabular-nums text-success">${money(receiveAmount)}</dd>
                </div>
              </dl>
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
                    {new Date(tx.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · Net ${money(tx.net)}
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
            <Button onClick={handleSubmit}>Confirm</Button>
          </>
        }
      >
        <dl className="divide-y divide-[var(--background-hover)]">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-less">Amount</dt>
            <dd className="font-bold tabular-nums text-foreground">${money(withdrawAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-less">Fee (16.5%)</dt>
            <dd className="tabular-nums text-less">-${money(fee)}</dd>
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
