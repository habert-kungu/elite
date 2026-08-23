"use client"


import { Card } from "@/components/ui"
import * as React from "react"
import Link from "next/link"
import { invalidateCache } from "@/lib/use-cached-fetch"
import { DEPOSIT_NETWORKS, depositNetwork, type DepositNetworkKey } from "@/lib/deposit-addresses"
import { POOLS, MIN_DEPOSIT_USD } from "@/lib/trading"

export default function InvestmentsPage() {
  const [copiedAddress, setCopiedAddress] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [selectedPlan, setSelectedPlan] = React.useState("weekly")
  const [network, setNetwork] = React.useState<DepositNetworkKey>("TRC20")
  const wallet = depositNetwork(network)
  const labelCls = "mb-1.5 block text-xs font-medium text-foreground sm:text-sm"
  const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--color-success)] focus:outline-none focus:ring-1 focus:ring-[var(--color-success)]/50 sm:px-4 sm:py-3 sm:text-base"
  const [txHash, setTxHash] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")

    try {
      const res = await fetch("/api/user/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          pool: selectedPlan,
          txHash: txHash.trim(),
          network,
          notes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit investment")
        return
      }

      const roi = `${POOLS[selectedPlan === "weekly" ? "weekly" : "daily"].roiMultiplier}x`
      const message = `🎯 *New Stake Request*\n\n*Plan:* ${selectedPlan === "weekly" ? "Weekly Pool" : "48H Pool"} (${roi} ROI)\n*Amount:* $${amount}\n*Network:* ${wallet.label}\n*TX Hash:* ${txHash}\n*DB ID:* ${data.investment?.id}\n${notes ? `\n*Notes:* ${notes}` : ""}`
      const telegramUrl = `https://t.me/khan_bashiri?text=${encodeURIComponent(message)}`
      window.open(telegramUrl, "_blank")

      invalidateCache("/api/user/")
      setSubmitSuccess(true)
      setShowConfirm(false)
      setAmount("")
      setTxHash("")
      setNotes("")
    } catch (error) {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const calculatedReturn = amount
    ? Math.round(parseFloat(amount) * POOLS[selectedPlan === "weekly" ? "weekly" : "daily"].roiMultiplier)
    : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Buy Crypto
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Stake to earn guaranteed returns
          </p>
        </div>
        <Link
          href="/app"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
        <button
          onClick={() => setSelectedPlan("daily")}
          className={`rounded-lg border bg-card p-3 text-left transition-all hover:bg-secondary/50 sm:p-4 ${selectedPlan === "daily" ? "border-[var(--color-success)] bg-[var(--bg-success)] ring-2 ring-[var(--color-success)]/35" : "border-border"}`}
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-foreground sm:text-base">
                48H Pool
              </div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">
                48 hours · profits paid within 48h
              </div>
            </div>
          </div>
          <div className="text-lg font-semibold text-foreground sm:text-xl">
            10x ROI
          </div>
        </button>

        <button
          onClick={() => setSelectedPlan("weekly")}
          className={`relative rounded-lg border bg-card p-3 text-left transition-all hover:bg-secondary/50 sm:p-4 ${selectedPlan === "weekly" ? "border-[var(--color-success)] bg-[var(--bg-success)] ring-2 ring-[var(--color-success)]/35" : "border-border"}`}
        >
          <div className="absolute -top-1.5 right-2 rounded bg-[var(--color-success)] px-1.5 py-0.5 text-[9px] font-medium text-white sm:right-3 sm:px-2 sm:text-[10px]">
            Popular
          </div>
          <div className="mb-2 flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-foreground sm:text-base">
                Weekly Pool
              </div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">
                7 days · profits paid after 7 days
              </div>
            </div>
          </div>
          <div className="text-lg font-semibold text-foreground sm:text-xl">
            10x ROI
          </div>
        </button>
      </div>

      {/* Deposit Form */}
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-medium text-foreground sm:text-lg">Make a Deposit</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
            Choose the network, send the funds, then paste the transaction hash so we can confirm it.
          </p>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {/* Step 1 — amount + network */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className={labelCls}>Amount (USD)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground sm:left-4">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN_DEPOSIT_USD}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className={`${fieldCls} pl-7 sm:pl-8`}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Minimum ${MIN_DEPOSIT_USD.toLocaleString()}</p>
            </div>

            <div>
              <label className={labelCls}>Network</label>
              <div className="relative">
                <select
                  value={network}
                  onChange={(e) => {
                    setNetwork(e.target.value as DepositNetworkKey)
                    setCopiedAddress(false)
                  }}
                  className={`${fieldCls} appearance-none pr-10`}
                  aria-label="Deposit network"
                >
                  {DEPOSIT_NETWORKS.map((n) => (
                    <option key={n.key} value={n.key}>
                      {n.label} · {n.chain}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Send {wallet.asset} on {wallet.chain} only</p>
            </div>
          </div>

          {/* Step 2 — address */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-success)]/30 bg-[var(--bg-success)]">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-success)]/20 px-3 py-2 sm:px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success)] text-[10px] font-bold text-white">2</span>
                <span className="text-xs font-medium text-foreground sm:text-sm">
                  Send {wallet.asset} to this {wallet.chain} address
                </span>
              </div>
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">{wallet.label}</span>
            </div>
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-card px-3 py-2.5 font-mono text-[11px] text-foreground sm:text-xs" data-testid="deposit-address">
                {wallet.address}
              </code>
              <button
                type="button"
                onClick={copyAddress}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                  copiedAddress ? "bg-card text-[var(--color-success)] ring-1 ring-[var(--color-success)]/40" : "bg-[var(--color-success)] text-white hover:opacity-90"
                }`}
              >
                {copiedAddress ? (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12" /></svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    Copy address
                  </>
                )}
              </button>
            </div>
            <p className="px-3 pb-3 text-[10px] text-muted-foreground sm:px-4 sm:text-[11px]">
              <span className="font-medium text-foreground">Important:</span> {wallet.hint} Send the exact amount — deposits on any other network can't be recovered.
            </p>
          </div>

          {/* Expected return */}
          {amount && parseFloat(amount) > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 p-3 sm:p-4">
              <div>
                <div className="mb-1 font-mono text-[10px] uppercase text-muted-foreground">Expected return</div>
                <div className="text-lg font-medium text-[var(--color-success)] sm:text-xl">${calculatedReturn.toLocaleString()}</div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                {selectedPlan === "weekly" ? "10x · paid after 7 days" : "10x · paid within 48 hours"}
              </div>
            </div>
          )}

          {/* Step 3 — proof */}
          <div>
            <label className={labelCls}>Transaction hash</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder={network === "BTC" ? "Paste the BTC transaction ID after sending" : "Paste the TRC20 transaction hash after sending"}
              className={`${fieldCls} font-mono text-xs sm:text-sm`}
            />
          </div>

          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the admin should know…"
              rows={2}
              className={`${fieldCls} resize-none text-xs sm:text-sm`}
            />
          </div>

          {submitSuccess && (
            <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--bg-success)] p-3 text-center text-sm text-[var(--color-success)]">
              Deposit submitted — we'll email you as soon as it's confirmed.
            </div>
          )}
          {submitError && (
            <div className="rounded-lg border border-destructive/30 bg-[var(--bg-danger)] p-3 text-center text-sm text-destructive">{submitError}</div>
          )}
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!amount || parseFloat(amount) < MIN_DEPOSIT_USD || !txHash || submitting}
            className="w-full rounded-lg bg-[var(--color-success)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5 sm:text-base"
          >
            {submitting ? "Submitting…" : `Submit ${wallet.asset} deposit`}
          </button>
        </div>
      </Card>

      {/* How it works */}
      <Card className="p-4 sm:p-6">
        <h3 className="mb-3 text-sm font-medium text-foreground sm:mb-4 sm:text-base">
          How it works
        </h3>
        <div className="space-y-3 sm:space-y-4">
          {[
            { step: "1", title: "Select Plan", desc: "48H or Weekly pool" },
            {
              step: "2",
              title: "Send Crypto",
              desc: "Send USDT (TRC20) or BTC to the address shown",
            },
            {
              step: "3",
              title: "Get Confirmed",
              desc: "Admin verifies & updates balance",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-[10px] font-medium text-white sm:h-8 sm:w-8 sm:text-sm">
                {item.step}
              </div>
              <div>
                <div className="text-xs font-medium text-foreground sm:text-sm">
                  {item.title}
                </div>
                <div className="text-[10px] text-muted-foreground sm:text-xs">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Confirm Submission
            </h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium text-foreground">
                  {selectedPlan === "weekly"
                    ? "Weekly Pool (10x)"
                    : "48H Pool (10x)"}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">${amount}</span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium text-foreground">{wallet.label}</span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Expected Return</span>
                <span className="font-bold text-[var(--color-success)]">
                  ${calculatedReturn.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-lg bg-[var(--color-success)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
