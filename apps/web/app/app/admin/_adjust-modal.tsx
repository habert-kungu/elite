"use client"

import * as React from "react"
import { invalidateCache } from "@/lib/use-cached-fetch"
import { Modal, inputCls } from "./_components"

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

type Draft = { pool: "daily" | "weekly"; amount: string; roi: string; status: string; progress: string }

function draftFrom(inv: AdminInvestment): Draft {
  return {
    pool: inv.pool === "weekly" ? "weekly" : "daily",
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
  const targetPreview = Math.round(amountNum * roiNum)
  const progressNum = Math.max(0, Math.min(100, Number(draft?.progress) || 0))
  const currentPreview = Math.round(amountNum + (targetPreview - amountNum) * (progressNum / 100))

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
        `${investment.userName}: ${draft.pool === "daily" ? "48H" : "Weekly"} Pool · $${amountNum.toLocaleString()} at ${roiNum}x → target $${json.investment.targetValue.toLocaleString()}${
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

  return (
    <Modal open={!!investment && !!draft} onClose={() => !busy && onClose()} title="Adjust plan">
      {investment && draft && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{investment.userName}</span> · {investment.userEmail}
          </p>
          {error && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-2.5 text-xs text-destructive">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Plan</label>
              <select className={inputCls} value={draft.pool} onChange={(e) => setDraft({ ...draft, pool: e.target.value as Draft["pool"] })}>
                <option value="daily">48H Pool</option>
                <option value="weekly">Weekly Pool</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Status</label>
              <select className={inputCls} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed (pay out)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Principal (USD)</label>
              <input className={inputCls} type="number" min={1} step="any" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Return multiplier (x)</label>
              <input className={inputCls} type="number" min={1} max={100} step="0.1" value={draft.roi} onChange={(e) => setDraft({ ...draft, roi: e.target.value })} />
            </div>
          </div>

          {draft.status === "active" && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <label className="font-medium text-foreground">Cycle progress</label>
                <span className="tabular-nums text-muted-foreground">
                  {progressNum}% · ${currentPreview.toLocaleString()} on the client's chart
                </span>
              </div>
              <input type="range" min={0} max={100} step={1} value={progressNum} onChange={(e) => setDraft({ ...draft, progress: e.target.value })} className="w-full accent-[var(--color-success)]" />
            </div>
          )}

          <div className="rounded-lg bg-secondary/50 p-3 text-xs">
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Target return</span><span className="font-semibold tabular-nums text-[var(--color-success)]">${targetPreview.toLocaleString()}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted-foreground">Client will see</span><span className="tabular-nums text-foreground">{draft.pool === "daily" ? "48H" : "Weekly"} Pool · {roiNum}x{draft.status === "active" ? ` · ${progressNum}% complete` : draft.status === "completed" ? " · completed, $" + targetPreview.toLocaleString() + " paid" : ` · ${draft.status}`}</span></div>
            {draft.status === "completed" && investment.status !== "completed" && (
              <p className="mt-2 text-[11px] text-[var(--color-warning)]">Marking completed records a ${targetPreview.toLocaleString()} return transaction and emails the client. This can't be undone from here.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button onClick={save} disabled={busy || amountNum <= 0 || roiNum < 1} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
