"use client"

import * as React from "react"
import { Button, ButtonLink, Card, EmptyState, Notice, Select, TextField } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { Pagination } from "@/components/data-table"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import { cn } from "@workspace/ui/lib/utils"
import { IconAlertTriangle, IconCircleCheck, IconMail, IconPlus, IconSearch, IconUsers, IconX } from "@tabler/icons-react"
import { ActionMenu, InvestorLink, KV, Modal, RoleBadge, Skeleton, StatGrid, formatDate } from "../_components"

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
              <> Email isn't configured, so send them this activation link (valid 72h): <code className="break-all rounded-[4px] bg-active px-1.5 py-0.5 font-mono text-[12px]">{json.link}</code></>
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
          <>Password reset for <strong>{json.email}</strong> and all their sessions ended. Email isn't configured, so send them this link (valid 24h): <code className="break-all rounded-[4px] bg-active px-1.5 py-0.5 font-mono text-[12px]">{json.link}</code></>
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
  const checkbox = "h-4 w-4 flex-shrink-0 accent-[var(--primary)]"
  const emptyTitle = q ? `No users match “${q}”` : "No users yet"
  const empty = <EmptyState icon={<IconUsers className="h-5 w-5" stroke={1.8} />} title={emptyTitle} description={q ? "Try a different name, email or Telegram handle." : "Add your first user to get started."} />
  const errorNotice = (
    <Notice tone="danger" icon={<IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
      {error}
    </Notice>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage registered users"
        actions={
          <>
            {checked.size > 0 && (
              <ButtonLink href={`/app/admin/communications?users=${Array.from(checked).join(",")}`} variant="secondary" size="sm">
                <IconMail className="h-4 w-4" stroke={1.8} />
                Email ({checked.size})
              </ButtonLink>
            )}
            <Button size="sm" onClick={() => { setError(""); setShowAdd(true) }}>
              <IconPlus className="h-4 w-4" stroke={2} />
              Add user
            </Button>
          </>
        }
      />

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
      {error && !showAdd && !removing && !resetting && errorNotice}

      <StatGrid
        items={[
          { label: "Total users", value: data.totals.users },
          { label: "Total deposits", value: `$${data.totals.deposits.toLocaleString()}` },
          { label: "Total returns", value: `$${data.totals.returns.toLocaleString()}`, className: "text-success" },
        ]}
      />

      {/* Filter row */}
      <div className="flex items-center gap-3">
        <label className="flex h-10 flex-shrink-0 items-center gap-2 rounded-[4px] px-2 text-[12px] font-bold text-less hover:bg-hover">
          <input type="checkbox" aria-label="Select all on this page" className={checkbox} checked={allOnPage} onChange={(e) => setChecked((prev) => { const next = new Set(prev); data.users.forEach((u) => (e.target.checked ? next.add(u.id) : next.delete(u.id))); return next })} />
          <span className="hidden sm:inline">All</span>
        </label>
        <TextField
          className="flex-1"
          name="user-search"
          type="search"
          aria-label="Search users"
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Search by name, email or Telegram…"
          leading={<IconSearch className="h-4 w-4" stroke={1.8} />}
          trailing={refreshing ? <span className="text-[12px]">Updating…</span> : undefined}
        />
      </div>

      {/* Mobile: stacked rows */}
      <Card className="overflow-hidden sm:hidden">
        {data.users.length === 0 ? (
          empty
        ) : (
          <div className="divide-y divide-[var(--background-hover)]">
            {data.users.map((u) => (
              <div key={u.id} className={cn("flex items-start gap-3 p-4", checked.has(u.id) && "bg-hover")}>
                <input type="checkbox" aria-label={`Select ${u.email}`} className={cn(checkbox, "mt-2.5")} checked={checked.has(u.id)} onChange={() => toggleChecked(u.id)} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <InvestorLink id={u.id} name={u.name} email={u.email} />
                    <ActionMenu items={menuFor(u)} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <KV label="Deposited">${u.deposits.toLocaleString()}</KV>
                    <KV label="Returns">
                      <span className="text-success">${u.returns.toLocaleString()}</span>
                    </KV>
                    <KV label="Telegram">{u.telegram || "—"}</KV>
                    <KV label="Joined">{formatDate(u.createdAt)}</KV>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={u.role} />
                    {u.id === me?.id && <span className="text-[12px] text-less">(you)</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden sm:block">
        {data.users.length === 0 ? (
          empty
        ) : (
          <div className="overflow-x-auto">
            <table className="table-linear min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-10" />
                  <th>User</th>
                  <th>Role</th>
                  <th className="text-right">Deposited</th>
                  <th className="text-right">Returns</th>
                  <th className="hidden lg:table-cell">Joined</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className={cn(checked.has(u.id) && "[&>td]:bg-hover")}>
                    <td>
                      <input type="checkbox" aria-label={`Select ${u.email}`} className={checkbox} checked={checked.has(u.id)} onChange={() => toggleChecked(u.id)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <InvestorLink id={u.id} name={u.name} email={u.email} size="sm" />
                        {u.id === me?.id && <span className="text-[12px] text-less">(you)</span>}
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="text-right font-bold tabular-nums text-foreground">${u.deposits.toLocaleString()}</td>
                    <td className="text-right font-bold tabular-nums text-success">${u.returns.toLocaleString()}</td>
                    <td className="hidden text-[12px] text-less lg:table-cell">{formatDate(u.createdAt)}</td>
                    <td className="text-right">
                      <ActionMenu items={menuFor(u)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} total={data.total} start={start} end={end} className="mt-4" />

      {/* Add user */}
      <Modal
        open={showAdd}
        onClose={() => !busy && setShowAdd(false)}
        title="Add user"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="admin-add-user" loading={busy} disabled={busy}>
              {busy ? "Creating…" : "Create user"}
            </Button>
          </>
        }
      >
        <form id="admin-add-user" onSubmit={handleAdd} className="space-y-4">
          {error && errorNotice}
          <TextField label="Full name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
          <TextField label="Email" name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Telegram" name="telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" />
            <Select label="Role" name="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <TextField
            label="Password"
            name="password"
            type="text"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Leave blank to send an activation link"
            autoComplete="off"
            help="Optional — leave blank to email them an activation link."
          />
        </form>
      </Modal>

      {/* Reset password */}
      <Modal
        open={!!resetting}
        onClose={() => !busy && setResetting(null)}
        title="Reset password"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} loading={busy} disabled={busy}>
              {busy ? "Resetting…" : "Reset & email"}
            </Button>
          </>
        }
      >
        {resetting && (
          <div className="space-y-4">
            {error && errorNotice}
            <p>
              Generate a temporary password for <strong className="font-bold text-foreground">{resetting.name || resetting.email}</strong>? They'll be signed out on every device and emailed a link to choose a new password.
            </p>
          </div>
        )}
      </Modal>

      {/* Remove user */}
      <Modal
        open={!!removing}
        onClose={() => !busy && setRemoving(null)}
        title="Remove user"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} loading={busy} disabled={busy}>
              {busy ? "Removing…" : "Remove user"}
            </Button>
          </>
        }
      >
        {removing && (
          <div className="space-y-4">
            {error && errorNotice}
            <p>
              Remove <strong className="font-bold text-foreground">{removing.name || removing.email}</strong>? This permanently deletes their account along with <strong className="font-bold text-foreground">{removing.investments}</strong> investment{removing.investments === 1 ? "" : "s"}, cycles and transaction history. This can't be undone.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
