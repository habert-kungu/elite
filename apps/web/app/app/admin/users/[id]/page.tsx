"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Card, StatusPill, statusTone } from "@/components/ui"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { ActionMenu, KV, Modal, Skeleton, StatGrid, formatDate } from "../../_components"
import { AdjustInvestmentModal, type AdminInvestment } from "../../_adjust-modal"

interface Detail {
  user: { id: string; email: string; name: string | null; telegram: string | null; walletAddress: string | null; role: string; createdAt: string; twoFactorEnabled?: boolean }
  stats: { deposited: number; returns: number; active: number; pending: number; completed: number }
  investments: AdminInvestment[]
  transactions: { id: string; type: string; amount: number; net: number; fee: number; status: string; note: string | null; txHash: string | null; createdAt: string }[]
}

const TYPE_STYLE: Record<string, string> = {
  deposit: "bg-[var(--bg-success)] text-[var(--color-success)]",
  investment: "bg-[var(--bg-success)] text-[var(--color-success)]",
  return: "bg-[var(--bg-info)] text-[var(--color-info)]",
  withdrawal: "bg-[var(--bg-danger)] text-destructive",
}

export default function InvestorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const key = `/api/admin/users/${id}`
  const { data, loading, error, refresh } = useCachedFetch<Detail>(key, { ttl: 30_000 })

  const [adjusting, setAdjusting] = React.useState<AdminInvestment | null>(null)
  const [confirm, setConfirm] = React.useState<"reset" | "remove" | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<React.ReactNode>(null)
  const [err, setErr] = React.useState("")

  const reload = async () => {
    invalidateCache("/api/admin/")
    await refresh()
  }

  const decide = async (inv: AdminInvestment, action: "approve" | "reject") => {
    setBusy(inv.id)
    setErr("")
    try {
      const res = await fetch(`/api/admin/investments/${inv.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investmentId: inv.id, action }) })
      const json = await res.json()
      if (!res.ok) setErr(json.error || "Failed")
      else {
        setNotice(`Deposit of $${inv.amount.toLocaleString()} ${action === "approve" ? "approved — cycle is active" : "rejected"}.`)
        await reload()
      }
    } finally {
      setBusy(null)
    }
  }

  const resetPassword = async () => {
    setBusy("reset")
    setErr("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resetPassword" }) })
      const json = await res.json()
      if (!res.ok) setErr(json.error || "Failed")
      else {
        setNotice(
          json.emailSent ? (
            <>Password reset — a link to choose a new password was emailed to <strong>{json.email}</strong> and all their sessions ended.</>
          ) : (
            <>Password reset and sessions ended. Email isn't configured, so send them this link (valid 24h): <code className="break-all rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{json.link}</code></>
          )
        )
        setConfirm(null)
      }
    } finally {
      setBusy(null)
    }
  }

  const toggleRole = async () => {
    if (!data) return
    const role = data.user.role === "admin" ? "user" : "admin"
    setBusy("role")
    setErr("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) })
      const json = await res.json()
      if (!res.ok) setErr(json.error || "Failed")
      else {
        setNotice(`${data.user.name || data.user.email} is now ${role === "admin" ? "an admin" : "a regular user"}.`)
        await reload()
      }
    } finally {
      setBusy(null)
    }
  }

  const disableTwoFactor = async () => {
    setBusy("2fa")
    setErr("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ twoFactorEnabled: false }) })
      const json = await res.json()
      if (!res.ok) setErr(json.error || "Failed")
      else {
        setNotice("Two-step verification turned off for this account — they can sign in with just their password and were emailed about the change.")
        await reload()
      }
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    setBusy("remove")
    setErr("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) setErr(json.error || "Failed")
      else {
        invalidateCache("/api/admin/")
        router.replace("/app/admin/users")
      }
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <Skeleton rows={4} />
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link href="/app/admin/users" className="text-xs text-muted-foreground hover:text-foreground">← All users</Link>
        <Card className="p-6 text-center text-sm text-muted-foreground">Investor not found.</Card>
      </div>
    )
  }

  const u = data.user
  const isMe = u.id === me?.id
  const initial = (u.name || u.email).charAt(0).toUpperCase()

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link href="/app/admin/users" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">← All users</Link>

      {/* Header */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground sm:h-14 sm:w-14 sm:text-lg">{initial}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{u.name || u.email}</h1>
                <StatusPill tone={u.role === "admin" ? "info" : "neutral"} className="capitalize">{u.role}</StatusPill>
                {isMe && <span className="text-[10px] text-muted-foreground">(you)</span>}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <Link href={`/app/admin/communications?users=${u.id}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">Email</Link>
            <ActionMenu
              items={[
                { label: "Reset password", onClick: () => setConfirm("reset") },
                { label: "Turn off two-step verification", onClick: disableTwoFactor, disabled: !u.twoFactorEnabled || busy === "2fa", title: u.twoFactorEnabled ? "Use when an investor can't receive their sign-in codes" : "Not enabled on this account" },
                { label: u.role === "admin" ? "Make regular user" : "Make admin", onClick: toggleRole, disabled: isMe, title: isMe ? "You can't change your own role" : undefined },
                { label: "Remove user", onClick: () => setConfirm("remove"), danger: true, disabled: isMe, title: isMe ? "You can't remove your own account" : undefined },
              ]}
            />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border pt-4 text-xs sm:grid-cols-2">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Telegram</dt><dd className="text-foreground">{u.telegram ? <a href={`https://t.me/${u.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="hover:underline">{u.telegram}</a> : "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Joined</dt><dd className="text-foreground">{formatDate(u.createdAt)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Two-step verification</dt><dd className={u.twoFactorEnabled ? "text-[var(--color-success)]" : "text-muted-foreground"}>{u.twoFactorEnabled ? "On (email code)" : "Off"}</dd></div>
          <div className="flex justify-between gap-3 sm:col-span-2"><dt className="text-muted-foreground">Withdrawal wallet</dt><dd className="break-all font-mono text-foreground">{u.walletAddress || "—"}</dd></div>
        </dl>
      </Card>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-success)]/25 bg-[var(--bg-success)] p-3 text-xs text-foreground">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">✕</button>
        </div>
      )}
      {err && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-3 text-xs text-destructive">{err}</div>}

      <StatGrid
        items={[
          { label: "Deposited", value: `$${data.stats.deposited.toLocaleString()}` },
          { label: "Returns", value: `$${data.stats.returns.toLocaleString()}`, className: "text-[var(--color-success)]" },
          { label: "Active", value: data.stats.active },
          { label: "Pending", value: data.stats.pending, className: data.stats.pending ? "text-[var(--color-warning)]" : undefined },
        ]}
      />

      {/* Investments */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Investments</h2>
        {data.investments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No investments yet</Card>
        ) : (
          <div className="space-y-2">
            {data.investments.map((inv) => (
              <Card key={inv.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{inv.pool === "daily" ? "48H Pool" : "Weekly Pool"}</span>
                      <StatusPill tone={statusTone(inv.status)} className="capitalize">{inv.status}</StatusPill>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{inv.roi}x · {inv.network === "BTC" ? "BTC" : "USDT TRC20"} · {formatDate(inv.createdAt)}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {inv.status === "pending" && (
                      <>
                        <button onClick={() => decide(inv, "approve")} disabled={busy === inv.id} className="rounded-lg bg-[var(--color-success)] px-2.5 py-1.5 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50">Approve</button>
                        <button onClick={() => decide(inv, "reject")} disabled={busy === inv.id} className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">Reject</button>
                      </>
                    )}
                    <ActionMenu items={[{ label: "Adjust plan", onClick: () => setAdjusting(inv) }]} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                  <KV label="Principal">${inv.amount.toLocaleString()}</KV>
                  <KV label="Target"><span className="text-[var(--color-success)]">${Math.round(inv.amount * inv.roi).toLocaleString()}</span></KV>
                  {inv.cycle && <KV label="Now">${Math.round(inv.cycle.currentValue).toLocaleString()}</KV>}
                  {inv.cycle && <KV label="Progress">{Math.round(inv.cycle.progress)}%</KV>}
                </div>
                {inv.cycle && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${Math.min(100, inv.cycle.progress)}%` }} />
                  </div>
                )}
                {inv.txHash && <div className="mt-2 break-all font-mono text-[10px] text-muted-foreground">TX {inv.txHash}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Transactions</h2>
        {data.transactions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No transactions yet</Card>
        ) : (
          <Card className="divide-y divide-border">
            {data.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${TYPE_STYLE[t.type] || "bg-secondary text-foreground"}`}>{t.type}</span>
                    <StatusPill tone={statusTone(t.status)} className="capitalize">{t.status}</StatusPill>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.note || "—"} · {formatDate(t.createdAt)}</div>
                </div>
                <div className={`flex-shrink-0 text-sm font-medium tabular-nums ${t.type === "return" ? "text-[var(--color-success)]" : "text-foreground"}`}>
                  {t.type === "return" ? "+" : t.type === "withdrawal" ? "-" : ""}${t.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <AdjustInvestmentModal investment={adjusting} onClose={() => setAdjusting(null)} onSaved={async (summary) => { setNotice(summary); await reload() }} />

      <Modal open={confirm === "reset"} onClose={() => !busy && setConfirm(null)} title="Reset password">
        <div className="space-y-4">
          <p className="text-sm text-foreground">Generate a temporary password for <strong>{u.name || u.email}</strong>? They'll be signed out everywhere and emailed a link to choose a new password.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} disabled={!!busy} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button onClick={resetPassword} disabled={!!busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{busy === "reset" ? "Resetting…" : "Reset & email"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={confirm === "remove"} onClose={() => !busy && setConfirm(null)} title="Remove user">
        <div className="space-y-4">
          <p className="text-sm text-foreground">Remove <strong>{u.name || u.email}</strong>? This permanently deletes their account, {data.investments.length} investment{data.investments.length === 1 ? "" : "s"}, cycles and transaction history.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} disabled={!!busy} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button onClick={remove} disabled={!!busy} className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">{busy === "remove" ? "Removing…" : "Remove user"}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
