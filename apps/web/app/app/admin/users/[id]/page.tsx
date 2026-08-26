"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Badge, Button, ButtonLink, Card, EmptyState, Notice, Tabs, statusTone } from "@/components/ui"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { cn } from "@workspace/ui/lib/utils"
import { IconAlertTriangle, IconArrowLeft, IconChartBar, IconCircleCheck, IconMail, IconReceipt2, IconX } from "@tabler/icons-react"
import { ActionMenu, KV, Modal, ProgressBar, RoleBadge, Skeleton, StatGrid, formatDate, planAmount, poolLabel, txTypeTone } from "../../_components"
import { AdjustInvestmentModal, type AdminInvestment } from "../../_adjust-modal"

interface Detail {
  user: { id: string; email: string; name: string | null; telegram: string | null; walletAddress: string | null; role: string; createdAt: string; twoFactorEnabled?: boolean }
  stats: { deposited: number; returns: number; active: number; pending: number; completed: number }
  investments: AdminInvestment[]
  transactions: { id: string; type: string; amount: number; net: number; fee: number; status: string; note: string | null; txHash: string | null; createdAt: string }[]
}

export default function InvestorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const key = `/api/admin/users/${id}`
  const { data, loading, error, refresh } = useCachedFetch<Detail>(key, { ttl: 30_000 })

  const [adjusting, setAdjusting] = React.useState<AdminInvestment | null>(null)
  const [confirm, setConfirm] = React.useState<"reset" | "remove" | "revoke" | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<React.ReactNode>(null)
  const [err, setErr] = React.useState("")
  const [tab, setTab] = React.useState<"investments" | "transactions">("investments")

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
        setNotice(`${poolLabel(inv.pool, true)} deposit of ${planAmount(inv.amount, inv.pool)} ${action === "approve" ? "approved — cycle is active" : "rejected"}.`)
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
            <>Password reset and sessions ended. Email isn't configured, so send them this link (valid 24h): <code className="break-all rounded-[4px] bg-active px-1.5 py-0.5 font-mono text-[12px]">{json.link}</code></>
          )
        )
        setConfirm(null)
      }
    } finally {
      setBusy(null)
    }
  }

  const setRole = async (role: "admin" | "user") => {
    if (!data) return
    setBusy("role")
    setErr("")
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) })
      const json = await res.json()
      if (!res.ok) setErr(json.error || "Failed")
      else {
        setConfirm(null)
        setNotice(
          role === "admin"
            ? `${data.user.name || data.user.email} is now an admin.`
            : `${data.user.name || data.user.email} is no longer an admin. Their sessions were signed out.`
        )
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
      <div className="space-y-6">
        <Link href="/app/admin/users" className="inline-flex items-center gap-1 text-[12px] font-bold text-less hover:text-foreground">
          <IconArrowLeft className="h-4 w-4" stroke={1.8} /> All users
        </Link>
        <Card>
          <EmptyState title="Investor not found" description="This account may have been removed." action={<ButtonLink href="/app/admin/users" variant="secondary" size="sm">Back to users</ButtonLink>} />
        </Card>
      </div>
    )
  }

  const u = data.user
  const isMe = u.id === me?.id
  const initial = (u.name || u.email).charAt(0).toUpperCase()

  return (
    <div className="space-y-6">
      <Link href="/app/admin/users" className="inline-flex items-center gap-1 text-[12px] font-bold text-less hover:text-foreground">
        <IconArrowLeft className="h-4 w-4" stroke={1.8} /> All users
      </Link>

      {/* Header */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[20px] font-bold text-primary-foreground">{initial}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[20px] font-bold leading-[30px] text-foreground md:text-[24px] md:leading-9">{u.name || u.email}</h1>
                <RoleBadge role={u.role} />
                {u.twoFactorEnabled && <Badge tone="success">2-step on</Badge>}
                {isMe && <span className="text-[12px] text-less">(you)</span>}
              </div>
              <div className="truncate text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">{u.email}</div>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <ButtonLink href={`/app/admin/communications?users=${u.id}`} size="sm">
              <IconMail className="h-4 w-4" stroke={1.8} />
              Email
            </ButtonLink>
            <ActionMenu
              items={[
                { label: "Reset password", onClick: () => setConfirm("reset") },
                u.role === "admin"
                  ? { label: "Revoke admin", onClick: () => setConfirm("revoke"), danger: true, disabled: isMe, title: isMe ? "You can't change your own role" : undefined }
                  : { label: "Make admin", onClick: () => setRole("admin"), disabled: isMe, title: isMe ? "You can't change your own role" : undefined },
                { label: "Remove user", onClick: () => setConfirm("remove"), danger: true, disabled: isMe, title: isMe ? "You can't remove your own account" : undefined },
              ]}
            />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-[var(--background-hover)] pt-5 text-[12px] leading-[18px] md:text-[14px] md:leading-5 sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-less">Telegram</dt>
            <dd className="text-foreground">{u.telegram ? <a href={`https://t.me/${u.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="hover:underline">{u.telegram}</a> : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-less">Joined</dt>
            <dd className="text-foreground">{formatDate(u.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-less">Two-step verification</dt>
            <dd className={u.twoFactorEnabled ? "text-success" : "text-less"}>{u.twoFactorEnabled ? "On (email code)" : "Off"}</dd>
          </div>
          <div className="flex justify-between gap-3 sm:col-span-2">
            <dt className="flex-shrink-0 text-less">Withdrawal wallet</dt>
            <dd className="break-all text-right font-mono text-[12px] text-foreground">{u.walletAddress || "—"}</dd>
          </div>
        </dl>
      </Card>

      {notice && (
        <Notice tone="success" icon={<IconCircleCheck className="h-4 w-4" stroke={1.8} />}>
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="-mr-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] text-less hover:bg-hover hover:text-foreground" aria-label="Dismiss">
              <IconX className="h-4 w-4" stroke={2} />
            </button>
          </div>
        </Notice>
      )}
      {err && (
        <Notice tone="danger" icon={<IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
          {err}
        </Notice>
      )}

      <StatGrid
        items={[
          { label: "Deposited", value: `$${data.stats.deposited.toLocaleString()}` },
          { label: "Returns", value: `$${data.stats.returns.toLocaleString()}`, className: "text-success" },
          { label: "Active", value: data.stats.active },
          { label: "Pending", value: data.stats.pending, className: data.stats.pending ? "text-warning" : undefined },
        ]}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "investments", label: `Investments (${data.investments.length})`, icon: <IconChartBar className="h-4 w-4" stroke={1.8} /> },
          { value: "transactions", label: `Transactions (${data.transactions.length})`, icon: <IconReceipt2 className="h-4 w-4" stroke={1.8} /> },
        ]}
      />

      {/* Investments */}
      {tab === "investments" && (
        <Card className="overflow-hidden">
          {data.investments.length === 0 ? (
            <EmptyState icon={<IconChartBar className="h-5 w-5" stroke={1.8} />} title="No investments yet" description="Deposits this investor submits will appear here." />
          ) : (
            <div className="divide-y divide-[var(--background-hover)]">
              {data.investments.map((inv) => (
                <div key={inv.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold leading-5 text-foreground md:text-[16px] md:leading-6">{poolLabel(inv.pool, true)}</span>
                        <Badge tone={statusTone(inv.status)} className="capitalize">
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="text-[12px] leading-[18px] text-less">
                        {inv.roi}x · {inv.network === "BTC" ? "BTC" : "USDT TRC20"} · {formatDate(inv.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {inv.status === "pending" && (
                        <>
                          <Button variant="success" size="sm" onClick={() => decide(inv, "approve")} disabled={busy === inv.id} loading={busy === inv.id}>
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => decide(inv, "reject")} disabled={busy === inv.id}>
                            Reject
                          </Button>
                        </>
                      )}
                      <ActionMenu items={[{ label: "Adjust plan", onClick: () => setAdjusting(inv) }]} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                    <KV label="Principal">{planAmount(inv.amount, inv.pool)}</KV>
                    <KV label="Target">
                      <span className="text-success">{planAmount(inv.amount * inv.roi, inv.pool)}</span>
                    </KV>
                    {inv.cycle && <KV label="Now">{planAmount(inv.cycle.currentValue, inv.pool)}</KV>}
                    {inv.cycle && <KV label="Progress">{Math.round(inv.cycle.progress)}%</KV>}
                  </div>
                  {inv.cycle && <ProgressBar value={inv.cycle.progress} />}
                  {inv.txHash && <div className="break-all font-mono text-[12px] leading-[18px] text-less">TX {inv.txHash}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Transactions */}
      {tab === "transactions" && (
        <Card className="overflow-hidden">
          {data.transactions.length === 0 ? (
            <EmptyState icon={<IconReceipt2 className="h-5 w-5" stroke={1.8} />} title="No transactions yet" description="Deposits, returns and withdrawals will be listed here." />
          ) : (
            <>
              {/* Mobile: stacked rows */}
              <div className="divide-y divide-[var(--background-hover)] sm:hidden">
                {data.transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={txTypeTone(t.type)} className="capitalize">
                          {t.type}
                        </Badge>
                        <Badge tone={statusTone(t.status)} className="capitalize">
                          {t.status}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-[12px] leading-[18px] text-less">
                        {t.note || "—"} · {formatDate(t.createdAt)}
                      </div>
                    </div>
                    <div className={cn("flex-shrink-0 text-[14px] font-bold tabular-nums", t.type === "return" ? "text-success" : t.type === "withdrawal" ? "text-destructive" : "text-foreground")}>
                      {t.type === "return" ? "+" : t.type === "withdrawal" ? "-" : ""}${t.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="table-linear min-w-[600px]">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Note</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Fee</th>
                      <th className="text-right">Net</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <Badge tone={txTypeTone(t.type)} className="capitalize">
                            {t.type}
                          </Badge>
                        </td>
                        <td className="max-w-[240px] truncate text-[12px] text-less" title={t.note || undefined}>
                          {t.note || "—"}
                        </td>
                        <td className={cn("text-right font-bold tabular-nums", t.type === "return" ? "text-success" : t.type === "withdrawal" ? "text-destructive" : "text-foreground")}>
                          {t.type === "return" ? "+" : t.type === "withdrawal" ? "-" : ""}${t.amount.toLocaleString()}
                        </td>
                        <td className="text-right tabular-nums text-less">{t.fee > 0 ? `-$${t.fee.toLocaleString()}` : "—"}</td>
                        <td className="text-right font-bold tabular-nums text-foreground">${t.net.toLocaleString()}</td>
                        <td>
                          <Badge tone={statusTone(t.status)} className="capitalize">
                            {t.status}
                          </Badge>
                        </td>
                        <td className="text-[12px] text-less">{formatDate(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      <AdjustInvestmentModal investment={adjusting} onClose={() => setAdjusting(null)} onSaved={async (summary) => { setNotice(summary); await reload() }} />

      <Modal
        open={confirm === "reset"}
        onClose={() => !busy && setConfirm(null)}
        title="Reset password"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={!!busy}>
              Cancel
            </Button>
            <Button onClick={resetPassword} loading={busy === "reset"} disabled={!!busy}>
              {busy === "reset" ? "Resetting…" : "Reset & email"}
            </Button>
          </>
        }
      >
        <p>
          Generate a temporary password for <strong className="font-bold text-foreground">{u.name || u.email}</strong>? They'll be signed out everywhere and emailed a link to choose a new password.
        </p>
      </Modal>

      <Modal
        open={confirm === "revoke"}
        onClose={() => !busy && setConfirm(null)}
        title="Revoke admin"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={!!busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setRole("user")} loading={busy === "role"} disabled={!!busy}>
              {busy === "role" ? "Revoking…" : "Revoke admin"}
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-[22px] text-general">
          Remove admin access from <strong className="font-bold text-foreground">{u.name || u.email}</strong>? They keep their account and history as a regular investor, lose the admin panel, and are signed out of every device.
        </p>
      </Modal>

      <Modal
        open={confirm === "remove"}
        onClose={() => !busy && setConfirm(null)}
        title="Remove user"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={!!busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={busy === "remove"} disabled={!!busy}>
              {busy === "remove" ? "Removing…" : "Remove user"}
            </Button>
          </>
        }
      >
        <p>
          Remove <strong className="font-bold text-foreground">{u.name || u.email}</strong>? This permanently deletes their account, {data.investments.length} investment{data.investments.length === 1 ? "" : "s"}, cycles and transaction history.
        </p>
      </Modal>
    </div>
  )
}
