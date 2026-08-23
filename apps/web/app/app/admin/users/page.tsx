"use client"

import * as React from "react"
import Link from "next/link"
import { Card, StatusPill } from "@/components/ui"
import { Pagination } from "@/components/data-table"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { PageHeader, StatGrid, Skeleton, Modal, ActionMenu, InvestorLink, KV, inputCls, formatDate } from "../_components"

const PAGE_SIZE = 10

interface AdminUser {
  id: string
  email: string
  name: string | null
  telegram: string | null
  role: string
  createdAt: string
  investments: number
  deposits: number
  returns: number
}

interface UsersResponse {
  users: AdminUser[]
  total: number
  page: number
  pageCount: number
  totals: { users: number; deposits: number; returns: number }
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const q = useDebounced(search.trim())

  const key = `/api/admin/users?page=${page}&pageSize=${PAGE_SIZE}&q=${encodeURIComponent(q)}`
  const { data, loading, refreshing, refresh } = useCachedFetch<UsersResponse>(key, { ttl: 60_000 })

  const [showAdd, setShowAdd] = React.useState(false)
  const [removing, setRemoving] = React.useState<AdminUser | null>(null)
  const [resetting, setResetting] = React.useState<AdminUser | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [notice, setNotice] = React.useState<React.ReactNode>(null)
  const [checked, setChecked] = React.useState<Set<string>>(new Set())
  const [form, setForm] = React.useState({ name: "", email: "", telegram: "", password: "", role: "user" })

  const toggleChecked = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const changeSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  const afterMutation = async () => {
    invalidateCache("/api/admin/")
    await refresh()
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to create user")
        return
      }
      setShowAdd(false)
      setForm({ name: "", email: "", telegram: "", password: "", role: "user" })
      setNotice(
        json.emailSent ? (
          <>Account created. An activation link was emailed to <strong>{json.user.email}</strong>.</>
        ) : (
          <>
            Account created for <strong>{json.user.email}</strong>.
            {json.link && (
              <> Email isn't configured, so send them this activation link (valid 72h): <code className="break-all rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{json.link}</code></>
            )}
          </>
        )
      )
      await afterMutation()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!removing) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${removing.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to remove user")
        return
      }
      setNotice(<>Removed <strong>{removing.name || removing.email}</strong> and all their records.</>)
      setRemoving(null)
      await afterMutation()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetting) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${resetting.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resetPassword" }) })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to reset password")
        return
      }
      setNotice(
        json.emailSent ? (
          <>Password reset for <strong>{json.email}</strong>. They've been signed out everywhere and emailed a link to choose a new password.</>
        ) : (
          <>Password reset for <strong>{json.email}</strong> and all their sessions ended. Email isn't configured, so send them this link (valid 24h): <code className="break-all rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{json.link}</code></>
        )
      )
      setResetting(null)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const toggleRole = async (u: AdminUser) => {
    const role = u.role === "admin" ? "user" : "admin"
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) })
      const json = await res.json()
      if (!res.ok) setError(json.error || "Failed to update role")
      else await afterMutation()
    } finally {
      setBusy(false)
    }
  }

  const menuFor = (u: AdminUser) => {
    const isMe = u.id === me?.id
    return [
      { label: "View investor", href: `/app/admin/users/${u.id}` },
      { label: "Email", href: `/app/admin/communications?users=${u.id}` },
      { label: "Reset password", onClick: () => { setError(""); setResetting(u) } },
      { label: u.role === "admin" ? "Make regular user" : "Make admin", onClick: () => toggleRole(u), disabled: busy || isMe, title: isMe ? "You can't change your own role" : undefined },
      { label: "Remove", onClick: () => { setError(""); setRemoving(u) }, danger: true, disabled: busy || isMe, title: isMe ? "You can't remove your own account" : undefined },
    ]
  }

  if (loading || !data) return <Skeleton rows={5} />

  const start = (data.page - 1) * PAGE_SIZE
  const end = Math.min(data.page * PAGE_SIZE, data.total)
  const allOnPage = data.users.length > 0 && data.users.every((u) => checked.has(u.id))

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage registered users"
        right={
          <>
            {checked.size > 0 && (
              <Link href={`/app/admin/communications?users=${Array.from(checked).join(",")}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                Email ({checked.size})
              </Link>
            )}
            <button onClick={() => { setError(""); setShowAdd(true) }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
              Add user
            </button>
          </>
        }
      />

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-success)]/25 bg-[var(--bg-success)] p-3 text-xs text-foreground">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">✕</button>
        </div>
      )}
      {error && !showAdd && !removing && !resetting && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-3 text-xs text-destructive">{error}</div>}

      <StatGrid
        items={[
          { label: "Total Users", value: data.totals.users },
          { label: "Total Deposits", value: `$${data.totals.deposits.toLocaleString()}` },
          { label: "Total Returns", value: `$${data.totals.returns.toLocaleString()}`, className: "text-[var(--color-success)]" },
        ]}
      />

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 pl-1 pr-1 text-[11px] text-muted-foreground">
            <input type="checkbox" aria-label="Select all on this page" className="h-3.5 w-3.5 accent-[var(--primary)]" checked={allOnPage} onChange={(e) => setChecked((prev) => { const next = new Set(prev); data.users.forEach((u) => (e.target.checked ? next.add(u.id) : next.delete(u.id))); return next })} />
            <span className="hidden sm:inline">All</span>
          </label>
          <div className="relative flex-1">
            <input type="search" value={search} onChange={(e) => changeSearch(e.target.value)} placeholder="Search by name, email or Telegram…" className={inputCls} />
            {refreshing && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Updating…</span>}
          </div>
        </div>
      </Card>

      {/* Mobile: cards */}
      <div className="space-y-2 sm:hidden">
        {data.users.map((u) => (
          <Card key={u.id} className={`p-3 ${checked.has(u.id) ? "ring-1 ring-primary/40" : ""}`}>
            <div className="flex items-start gap-3">
              <input type="checkbox" aria-label={`Select ${u.email}`} className="mt-2 h-3.5 w-3.5 flex-shrink-0 accent-[var(--primary)]" checked={checked.has(u.id)} onChange={() => toggleChecked(u.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <InvestorLink id={u.id} name={u.name} email={u.email} />
                  <ActionMenu items={menuFor(u)} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <KV label="Deposited">${u.deposits.toLocaleString()}</KV>
                  <KV label="Returns"><span className="text-[var(--color-success)]">${u.returns.toLocaleString()}</span></KV>
                  <KV label="Telegram">{u.telegram || "—"}</KV>
                  <KV label="Joined">{formatDate(u.createdAt)}</KV>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusPill tone={u.role === "admin" ? "info" : "neutral"} className="capitalize">{u.role}</StatusPill>
                  {u.id === me?.id && <span className="text-[10px] text-muted-foreground">(you)</span>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {data.users.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">{q ? `No users match “${q}”` : "No users yet"}</Card>}
      </div>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden sm:block">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="w-8 px-3 py-2.5" />
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">User</th>
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground">Role</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Deposited</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase text-muted-foreground">Returns</th>
              <th className="hidden px-3 py-2.5 text-left font-mono text-[9px] uppercase text-muted-foreground lg:table-cell">Joined</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.users.map((u) => (
              <tr key={u.id} className={`hover:bg-secondary/30 ${checked.has(u.id) ? "bg-secondary/40" : ""}`}>
                <td className="px-3 py-2.5"><input type="checkbox" aria-label={`Select ${u.email}`} className="h-3.5 w-3.5 accent-[var(--primary)]" checked={checked.has(u.id)} onChange={() => toggleChecked(u.id)} /></td>
                <td className="px-3 py-2.5"><InvestorLink id={u.id} name={u.name} email={u.email} size="sm" />{u.id === me?.id && <span className="ml-8 text-[10px] text-muted-foreground">(you)</span>}</td>
                <td className="px-3 py-2.5"><StatusPill tone={u.role === "admin" ? "info" : "neutral"} className="capitalize">{u.role}</StatusPill></td>
                <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-foreground">${u.deposits.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums text-[var(--color-success)]">${u.returns.toLocaleString()}</td>
                <td className="hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">{formatDate(u.createdAt)}</td>
                <td className="px-2 py-2.5 text-right"><ActionMenu items={menuFor(u)} /></td>
              </tr>
            ))}
            {data.users.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">{q ? `No users match “${q}”` : "No users yet"}</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />

      {/* Add user */}
      <Modal open={showAdd} onClose={() => !busy && setShowAdd(false)} title="Add user">
        <form onSubmit={handleAdd} className="space-y-3">
          {error && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-2.5 text-xs text-destructive">{error}</div>}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Full name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Email</label>
            <input className={inputCls} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Telegram</label>
              <input className={inputCls} value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Role</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Password <span className="font-normal text-muted-foreground">(optional — leave blank to email them an activation link)</span></label>
            <input className={inputCls} type="text" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to send an activation link" autoComplete="off" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{busy ? "Creating…" : "Create user"}</button>
          </div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal open={!!resetting} onClose={() => !busy && setResetting(null)} title="Reset password">
        {resetting && (
          <div className="space-y-4">
            {error && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-2.5 text-xs text-destructive">{error}</div>}
            <p className="text-sm text-foreground">Generate a temporary password for <strong>{resetting.name || resetting.email}</strong>? They'll be signed out on every device and emailed a link to choose a new password.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetting(null)} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
              <button onClick={handleResetPassword} disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{busy ? "Resetting…" : "Reset & email"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove user */}
      <Modal open={!!removing} onClose={() => !busy && setRemoving(null)} title="Remove user">
        {removing && (
          <div className="space-y-4">
            {error && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-2.5 text-xs text-destructive">{error}</div>}
            <p className="text-sm text-foreground">Remove <strong>{removing.name || removing.email}</strong>? This permanently deletes their account along with <strong>{removing.investments}</strong> investment{removing.investments === 1 ? "" : "s"}, cycles and transaction history. This can't be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRemoving(null)} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
              <button onClick={handleRemove} disabled={busy} className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">{busy ? "Removing…" : "Remove user"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
