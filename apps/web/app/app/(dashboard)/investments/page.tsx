"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, Button, Card, CardHeader, Modal, Notice, Select, Stat, Tabs, TextArea, TextField } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useAuth } from "@/app/providers/auth-provider"
import { invalidateCache, useCachedFetch } from "@/lib/use-cached-fetch"
import { DEPOSIT_NETWORKS, depositNetwork, type DepositNetworkKey, type ResolvedDepositNetwork } from "@/lib/deposit-addresses"
import {
  PLANS,
  SELECTABLE_PLANS,
  calculateRoi,
  calculateTargetReturn,
  formatPlanAmount,
  planFor,
  poolLabel,
  validatePlanAmount,
  type PlanKey,
} from "@/lib/trading"
import { IconAlertTriangle, IconCheck, IconChevronRight, IconCircleCheck, IconClockHour4, IconCopy } from "@tabler/icons-react"

/** Open cycles come from the same cached stats feed the Overview page uses. */
interface OpenCycle {
  id: string
  pool: string
  planName?: string
  currency?: "USD" | "BTC"
  durationDays?: number
  roi?: number
  startValue: number
  currentValue: number
  targetValue: number
  progress: number
  status: string
}

/** Running values: whole dollars for USD plans, 4 decimals for BTC. */
function fmtRunning(n: number, pool: string) {
  return formatPlanAmount(n, pool, planFor(pool).currency === "BTC" ? 4 : 0)
}

function durationLabel(days: number) {
  return days === 1 ? "24 hours" : `${days} days`
}

const PLAN_TAB_LABEL: Record<string, string> = {
  daily: "Daily · 24h",
  pro5: "Pro · 5 days",
  plan8: "8 days",
  premium12: "Premium · BTC",
}

const PLAN_TABS: { value: PlanKey; label: React.ReactNode }[] = SELECTABLE_PLANS.map((p) => ({
  value: p.key,
  label: p.popular ? (
    <span className="inline-flex items-center gap-2">
      {PLAN_TAB_LABEL[p.key] ?? p.name}
      <Badge tone="brand">Popular</Badge>
    </span>
  ) : (
    PLAN_TAB_LABEL[p.key] ?? p.name
  ),
}))

/** Deposit destination that carries BTC, if the config has one. */
const BTC_NETWORK = DEPOSIT_NETWORKS.find((n) => n.asset === "BTC")

export default function InvestmentsPage() {
  const { user } = useAuth()
  const { data: stats } = useCachedFetch<{ activeCycles: OpenCycle[] }>(user ? "/api/user/stats" : null, { ttl: 60_000 })
  const openCycles = stats?.activeCycles ?? []

  const [copiedAddress, setCopiedAddress] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>("pro5")
  const [network, setNetwork] = React.useState<DepositNetworkKey>("TRC20")
  // Receiving addresses are resolved on the server at request time, so the
  // built image never carries one and rotating a wallet needs no rebuild.
  const { data: deposit } = useCachedFetch<{ networks: ResolvedDepositNetwork[] }>(
    user ? "/api/deposit-networks" : null,
    { ttl: 5 * 60_000 }
  )
  const meta = depositNetwork(network)
  const resolved = deposit?.networks.find((n) => n.key === network)
  const wallet = { ...meta, address: resolved?.address ?? "" }
  const addressReady = wallet.address.length > 0
  const [txHash, setTxHash] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  const plan = PLANS[selectedPlan]
  const isBtcPlan = plan.currency === "BTC"
  // A BTC-denominated plan can only be funded on the BTC network.
  const networkOptions = isBtcPlan && BTC_NETWORK ? DEPOSIT_NETWORKS.filter((n) => n.asset === "BTC") : DEPOSIT_NETWORKS

  const choosePlan = (key: PlanKey) => {
    if (key === selectedPlan) return
    const next = PLANS[key]
    setSelectedPlan(key)
    setAmount("")
    setSubmitSuccess(false)
    setCopiedAddress(false)
    if (next.currency === "BTC" && BTC_NETWORK) setNetwork(BTC_NETWORK.key)
    else if (plan.currency === "BTC") setNetwork("TRC20")
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const stake = amount ? parseFloat(amount) || 0 : 0
  const calculatedReturn = calculateTargetReturn(stake, selectedPlan)
  const roi = calculateRoi(stake, selectedPlan)
  const amountError = amount ? validatePlanAmount(stake, selectedPlan) : null
  const canSubmit = stake > 0 && !amountError && !!txHash && !submitting && addressReady

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

      const message = `🎯 *New Stake Request*\n\n*Plan:* ${plan.name} (${roi}x ROI)\n*Amount:* ${formatPlanAmount(stake, selectedPlan)}\n*Network:* ${wallet.label}\n*TX Hash:* ${txHash}\n*DB ID:* ${data.investment?.id}\n${notes ? `\n*Notes:* ${notes}` : ""}`
      const telegramUrl = `https://t.me/Patrick_vile?text=${encodeURIComponent(message)}`
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade"
        description="Choose a plan, send the funds on your preferred network and submit the transfer for verification."
        actions={
          <Link href="/app/transactions" className="text-[14px] font-bold text-brand hover:underline">
            View reports
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Trade panel */}
        <Card className="overflow-hidden animate-fade-up">
          <Tabs items={PLAN_TABS} value={selectedPlan} onChange={choosePlan} className="px-2" />

          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{plan.name}</Badge>
              <Badge tone="brand">{plan.tagline}</Badge>
              <span className="text-[12px] leading-[18px] text-less">Settles after {durationLabel(plan.durationDays)}</span>
            </div>

            {/* Tier quick-pick */}
            <div>
              <div className="field-label">Pick a tier</div>
              <div className="flex flex-wrap gap-2">
                {plan.tiers.map((t) => {
                  const selected = stake === t.invest
                  return (
                    <button
                      key={t.invest}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAmount(String(t.invest))}
                      className={`rounded-[8px] border px-3 py-2 text-[12px] leading-[18px] tabular-nums transition-colors ${
                        selected
                          ? "border-[var(--brand-accent)] bg-brand-soft text-foreground"
                          : "border-border bg-background text-general hover:bg-hover hover:text-foreground"
                      }`}
                    >
                      Invest <span className="font-bold">{formatPlanAmount(t.invest, plan.key)}</span> → earn{" "}
                      <span className="font-bold">{formatPlanAmount(t.earn, plan.key)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount + network */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min={plan.minInvest}
                max={plan.maxInvest}
                step={isBtcPlan ? "0.0001" : "1"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(plan.minInvest)}
                leading={<span className="text-[14px] font-bold">{isBtcPlan ? "BTC" : "USD"}</span>}
                inputClassName="pl-14 tabular-nums"
                help={`${formatPlanAmount(plan.minInvest, plan.key)} – ${formatPlanAmount(plan.maxInvest, plan.key)}`}
                error={amountError ?? undefined}
              />
              <Select
                label="Network"
                name="network"
                value={network}
                onChange={(e) => {
                  setNetwork(e.target.value as DepositNetworkKey)
                  setCopiedAddress(false)
                }}
                aria-label="Deposit network"
                disabled={networkOptions.length === 1}
                help={isBtcPlan ? `${plan.shortName} is funded in BTC only` : `Send ${wallet.asset} on ${wallet.chain} only`}
              >
                {networkOptions.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label} · {n.chain}
                  </option>
                ))}
              </Select>
            </div>

            {/* Payout preview */}
            <div className="grid grid-cols-2 gap-y-3 rounded-[8px] bg-background sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-[var(--background-hover)]">
              <Stat className="px-4 py-3" label="Invest" value={formatPlanAmount(stake, plan.key)} />
              <Stat className="px-4 py-3" label="You earn" value={formatPlanAmount(calculatedReturn, plan.key)} tone="success" />
              <Stat className="px-4 py-3" label="Return" value={`${roi}x`} />
              <Stat className="px-4 py-3" label="Duration" value={durationLabel(plan.durationDays)} />
            </div>

            {/* Deposit address */}
            <div className="rounded-[8px] bg-background p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14px] font-bold text-foreground">
                  Send {wallet.asset} to this {wallet.chain} address
                </span>
                <Badge tone="info">{wallet.label}</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-[8px] bg-surface px-3 py-2.5 font-mono text-[12px] leading-[18px] text-foreground" data-testid="deposit-address">
                  {addressReady ? wallet.address : deposit ? "Unavailable — contact support" : "Loading…"}
                </code>
                <Button type="button" variant={copiedAddress ? "success" : "secondary"} size="sm" onClick={copyAddress} className="flex-shrink-0" disabled={!addressReady}>
                  {copiedAddress ? <IconCheck className="h-4 w-4" stroke={2} /> : <IconCopy className="h-4 w-4" stroke={1.8} />}
                  {copiedAddress ? "Copied" : "Copy address"}
                </Button>
              </div>
              <p className="mt-3 text-[12px] leading-[18px] text-less">
                <span className="font-bold text-foreground">Important:</span> {wallet.hint} Send the exact amount — deposits on any other network can't be recovered.
              </p>
            </div>

            {/* Proof */}
            <TextField
              label="Transaction hash"
              name="txHash"
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder={network === "BTC" ? "Paste the BTC transaction ID after sending" : "Paste the TRC20 transaction hash after sending"}
              inputClassName="font-mono text-[12px]"
            />

            <TextArea
              label="Notes (optional)"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the admin should know…"
              rows={2}
              inputClassName="resize-none"
            />

            {submitSuccess && (
              <Notice tone="success" icon={<IconCircleCheck className="h-4 w-4" stroke={1.8} />}>
                Deposit submitted — we'll email you as soon as it's confirmed.
              </Notice>
            )}
            {submitError && (
              <Notice tone="danger" icon={<IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
                {submitError}
              </Notice>
            )}

            <Button type="button" block onClick={() => setShowConfirm(true)} disabled={!canSubmit} loading={submitting}>
              {submitting ? "Submitting…" : `Start trading · ${wallet.asset} deposit`}
            </Button>
          </div>
        </Card>

        {/* Right rail */}
        <div className="space-y-6 lg:sticky lg:top-20">
          <Card className="p-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <CardHeader
              title="Open cycles"
              description={openCycles.length ? `${openCycles.length} running` : "Nothing running yet"}
              action={
                <Link href="/app" className="text-[12px] font-bold text-brand hover:underline">
                  Overview
                </Link>
              }
            />
            <div className="mt-4 divide-y divide-[var(--background-hover)]">
              {openCycles.map((c) => {
                const progress = Math.min(100, Math.max(0, c.progress || 0))
                const cycleRoi = c.roi ?? Math.round((c.targetValue / (c.startValue || 1)) * 10) / 10
                return (
                  <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[14px] font-bold text-foreground">{c.planName ?? poolLabel(c.pool)}</span>
                        <Badge tone="success" dot>Open</Badge>
                      </div>
                      <span className="text-[14px] font-bold tabular-nums text-foreground">{fmtRunning(c.currentValue, c.pool)}</span>
                    </div>
                    <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[var(--background-active)]">
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] leading-[18px] text-less tabular-nums">
                      <span>Entry {fmtRunning(c.startValue, c.pool)}</span>
                      <span>{Math.round(progress)}% · {cycleRoi}x · {fmtRunning(c.targetValue, c.pool)}</span>
                    </div>
                  </div>
                )
              })}
              {openCycles.length === 0 && (
                <div className="flex items-center gap-3 rounded-[8px] bg-background p-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <IconClockHour4 className="h-4 w-4" stroke={1.8} />
                  </div>
                  <p className="text-[12px] leading-[18px] text-less">Your first cycle opens as soon as a deposit is confirmed.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 animate-fade-up" style={{ animationDelay: "140ms" }}>
            <CardHeader title="How it works" />
            <ol className="mt-4 space-y-3">
              {[
                { title: "Pick a plan", desc: "Daily (24h), Pro (5 days), 8 days or Premium (12 days, BTC)." },
                { title: "Send the funds", desc: "USDT (TRC20) or BTC to the address shown." },
                { title: "Get confirmed", desc: "We verify the transfer and open your cycle." },
              ].map((item, i) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold leading-5 text-foreground">{item.title}</div>
                    <div className="text-[12px] leading-[18px] text-less">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Link href="/app/support" className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline">
              Need help? <IconChevronRight className="h-4 w-4" stroke={2} />
            </Link>
          </Card>
        </div>
      </div>

      {/* Confirmation */}
      <Modal
        open={showConfirm}
        onClose={() => !submitting && setShowConfirm(false)}
        title="Confirm deposit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {submitting ? "Submitting…" : "Confirm and submit"}
            </Button>
          </>
        }
      >
        <dl className="divide-y divide-[var(--background-hover)]">
          {[
            { k: "Plan", v: `${plan.name} (${roi}x)` },
            { k: "Duration", v: durationLabel(plan.durationDays) },
            { k: "Amount", v: formatPlanAmount(stake, plan.key) },
            { k: "Network", v: wallet.label },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-less">{row.k}</dt>
              <dd className="text-right font-bold text-foreground">{row.v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-less">Expected payout</dt>
            <dd className="text-right font-bold tabular-nums text-success">{formatPlanAmount(calculatedReturn, plan.key)}</dd>
          </div>
        </dl>
      </Modal>
    </div>
  )
}
