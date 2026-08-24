"use client"

import * as React from "react"
import { invalidateCache } from "@/lib/use-cached-fetch"
import { Button, Modal, Notice, Select, TextField } from "@/components/ui"
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react"
import { PLANS, PLAN_KEYS, calculateRoi, formatPlanAmount, isPlanKey, planCurrency, planFor, type PlanKey } from "@/lib/trading"
import { poolLabel } from "./_components"

export interface AdminInvestment {
  id: string
  userId: string
  userName: string
  userEmail: string
  amount: number
  pool: string
  roi: number
  status: string
  txHash: string | null
  network?: string
  createdAt: string
  cycle: { currentValue: number; targetValue: number; progress: number; status: string } | null
}

type Draft = { pool: PlanKey; amount: string; roi: string; status: string; progress: string }

function draftFrom(inv: AdminInvestment): Draft {
  return {
    pool: isPlanKey(inv.pool) ? inv.pool : "daily",
    amount: String(inv.amount),
    roi: String(inv.roi),
    status: inv.status,
    progress: String(Math.round(inv.cycle?.progress ?? 0)),
  }
}

/** Admin "Adjust plan" dialog — pool, principal, multiplier, status, progress. */
export function AdjustInvestmentModal({
  investment,
  onClose,
  onSaved,
}: {
  investment: AdminInvestment | null
  onClose: () => void
  onSaved: (summary: string) => void | Promise<void>
}) {
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    setDraft(investment ? draftFrom(investment) : null)
    setError("")
  }, [investment])

  const amountNum = Number(draft?.amount) || 0
  const roiNum = Number(draft?.roi) || 0
  const pool: PlanKey = draft?.pool ?? "daily"
  const plan = planFor(pool)
  const isBtc = planCurrency(pool) === "BTC"
  // BTC plans keep fractional precision; USD plans round to whole dollars.
  const round = (n: number) => (isBtc ? Math.round(n * 1e6) / 1e6 : Math.round(n))
  const targetPreview = round(amountNum * roiNum)
  const progressNum = Math.max(0, Math.min(100, Number(draft?.progress) || 0))
  const currentPreview = round(amountNum + (targetPreview - amountNum) * (progressNum / 100))
  const fmt = (n: number) => formatPlanAmount(n, pool)
  const targetLabel = fmt(targetPreview)

  /** Plan options: the four live plans, plus the legacy key if this row still uses it. */
  const planOptions: PlanKey[] = draft && !PLAN_KEYS.includes(draft.pool) ? [...PLAN_KEYS, draft.pool] : PLAN_KEYS

  const changePlan = (next: PlanKey) => {
    if (!draft) return
    // Switching plan: keep the principal, prefill the multiplier from the new plan's payout table.
    setDraft({ ...draft, pool: next, roi: String(calculateRoi(amountNum, next)) })
  }

  const save = async () => {
    if (!investment || !draft) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/investments/${investment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentId: investment.id,
          action: "update",
          pool: draft.pool,
          amount: amountNum,
          roi: roiNum,
          status: draft.status,
          progress: draft.status === "active" ? progressNum : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to update")
        return
      }
      invalidateCache("/api/admin/")
      await onSaved(
        `${investment.userName}: ${poolLabel(draft.pool, true)} · ${fmt(amountNum)} at ${roiNum}x → target ${fmt(json.investment.targetValue)}${
          draft.status === "completed" ? " · marked completed and paid out" : draft.status === "active" ? ` · ${Math.round(json.investment.progress)}% progress` : ` · ${draft.status}`
        }. The client's portfolio updates immediately.`
      )
      onClose()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const close = () => !busy && onClose()
  const isCompleting = !!draft && draft.status === "completed" && !!investment && investment.status !== "completed"

  return (
    <Modal
      open={!!investment && !!draft}
      onClose={close}
      title="Adjust plan"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={isCompleting ? "danger" : "primary"} onClick={save} loading={busy} disabled={busy || amountNum <= 0 || roiNum < 1}>
            {busy ? "Saving…" : isCompleting ? "Complete & pay out" : "Save changes"}
          </Button>
        </>
      }
    >
      {investment && draft && (
        <div className="space-y-4">
          <p className="text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">
            <span className="font-bold text-foreground">{investment.userName}</span> · {investment.userEmail}
          </p>
          {error && (
            <Notice tone="danger" icon={<IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
              {error}
            </Notice>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Plan" name="adjust-pool" value={draft.pool} onChange={(e) => changePlan(e.target.value as PlanKey)}>
              {planOptions.map((k) => (
                <option key={k} value={k}>
                  {PLANS[k].name}
                  {PLANS[k].legacy ? " (legacy)" : ""}
                </option>
              ))}
            </Select>
            <Select label="Status" name="adjust-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed (pay out)</option>
              <option value="rejected">Rejected</option>
            </Select>
            <TextField
              label={`Principal (${isBtc ? "BTC" : "USD"})`}
              name="adjust-amount"
              type="number"
              min={0}
              step="any"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              help={`${plan.name}: ${fmt(plan.minInvest)} – ${fmt(plan.maxInvest)} · ${plan.durationDays === 1 ? "24 hours" : `${plan.durationDays} days`}`}
            />
            <TextField label="Return multiplier (x)" name="adjust-roi" type="number" min={1} max={100} step="0.1" value={draft.roi} onChange={(e) => setDraft({ ...draft, roi: e.target.value })} />
          </div>

          {draft.status === "active" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="adjust-progress" className="field-label mb-0">
                  Cycle progress
                </label>
                <span className="text-[12px] leading-[18px] tabular-nums text-less">
                  {progressNum}% · {fmt(currentPreview)} on the client's chart
                </span>
              </div>
              <input id="adjust-progress" type="range" min={0} max={100} step={1} value={progressNum} onChange={(e) => setDraft({ ...draft, progress: e.target.value })} className="w-full accent-[var(--primary)]" />
            </div>
          )}

          <div className="rounded-[8px] bg-surface p-4 text-[12px] leading-[18px] md:text-[14px] md:leading-5">
            <div className="flex justify-between gap-3 py-0.5">
              <span className="text-less">Target return</span>
              <span className="font-bold tabular-nums text-success">{targetLabel}</span>
            </div>
            <div className="flex justify-between gap-3 py-0.5">
              <span className="text-less">Client will see</span>
              <span className="text-right tabular-nums text-foreground">
                {poolLabel(draft.pool, true)} · {roiNum}x
                {draft.status === "active" ? ` · ${progressNum}% complete` : draft.status === "completed" ? ` · completed, ${targetLabel} paid` : ` · ${draft.status}`}
              </span>
            </div>
          </div>

          {isCompleting && (
            <Notice tone="warning" icon={<IconInfoCircle className="h-4 w-4" stroke={1.8} />}>
              Marking completed records a {targetLabel} return transaction and emails the client. This can't be undone from here.
            </Notice>
          )}
        </div>
      )}
    </Modal>
  )
}
