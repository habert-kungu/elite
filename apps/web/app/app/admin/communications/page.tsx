"use client"

import * as React from "react"
import { Card } from "@/components/ui"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { PageHeader, Skeleton, inputCls } from "../_components"

interface MailStatus {
  configured: boolean
  host: string | null
  port: number
  secure: boolean
  from: string
  appUrl: string
  adminEmail: string | null
  connection: { ok: boolean; error?: string }
  audience: { all: number; users: number; admins: number }
}

type Audience = "all" | "users" | "admins" | "selected" | "email"

interface PickUser { id: string; email: string; name: string | null; role: string }

/** Searchable checkbox list of users for the "selected investors" audience. */
function UserPicker({ selected, onChange }: { selected: PickUser[]; onChange: (users: PickUser[]) => void }) {
  const [q, setQ] = React.useState("")
  const [debounced, setDebounced] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])
  const { data, loading } = useCachedFetch<{ users: PickUser[]; total: number }>(`/api/admin/users?page=1&pageSize=100&q=${encodeURIComponent(debounced)}`, { ttl: 60_000 })
  const users = data?.users ?? []
  const isOn = (id: string) => selected.some((u) => u.id === id)
  const toggle = (u: PickUser) => onChange(isOn(u.id) ? selected.filter((x) => x.id !== u.id) : [...selected, u])
  const visibleIds = users.map((u) => u.id)
  const allVisibleOn = visibleIds.length > 0 && visibleIds.every(isOn)

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <input className={inputCls} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search investors by name, email or Telegram…" />
        <button
          type="button"
          onClick={() => onChange(allVisibleOn ? selected.filter((u) => !visibleIds.includes(u.id)) : [...selected, ...users.filter((u) => !isOn(u.id))])}
          className="shrink-0 rounded-md border border-border px-2 py-2 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {allVisibleOn ? "Unselect shown" : "Select shown"}
        </button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border p-2">
          {selected.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground">
              {u.name || u.email}
              <button type="button" onClick={() => toggle(u)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${u.email}`}>✕</button>
            </span>
          ))}
          <button type="button" onClick={() => onChange([])} className="px-1 text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}
      <div className="max-h-56 overflow-y-auto">
        {loading && <p className="p-3 text-xs text-muted-foreground">Loading…</p>}
        {!loading && users.length === 0 && <p className="p-3 text-xs text-muted-foreground">No users match.</p>}
        {users.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs hover:bg-secondary/50">
            <input type="checkbox" checked={isOn(u.id)} onChange={() => toggle(u)} className="h-3.5 w-3.5 accent-[var(--primary)]" />
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">{(u.name || u.email).charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground">{u.name || "—"}</span>
              <span className="block truncate text-muted-foreground">{u.email}</span>
            </span>
            {u.role === "admin" && <span className="rounded bg-[var(--bg-info)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--color-info)]">Admin</span>}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function CommunicationsPage() {
  const { data, loading, refresh, refreshing } = useCachedFetch<MailStatus>("/api/admin/mail", { ttl: 60_000 })

  const [testing, setTesting] = React.useState(false)
  const [testMsg, setTestMsg] = React.useState<{ ok: boolean; text: string } | null>(null)

  const [audience, setAudience] = React.useState<Audience>("users")
  const [email, setEmail] = React.useState("")
  const [selectedUsers, setSelectedUsers] = React.useState<PickUser[]>([])

  // Arriving from Users page with ?users=id1,id2 → preselect those investors.
  React.useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("users")?.split(",").filter(Boolean)
    if (!ids?.length) return
    setAudience("selected")
    fetch(`/api/admin/users?page=1&pageSize=100`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const found: PickUser[] = (json?.users ?? []).filter((u: PickUser) => ids.includes(u.id))
        if (found.length) setSelectedUsers(found)
      })
      .catch(() => {})
  }, [])
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [ctaLabel, setCtaLabel] = React.useState("")
  const [ctaUrl, setCtaUrl] = React.useState("")
  const [confirm, setConfirm] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [sendMsg, setSendMsg] = React.useState<{ ok: boolean; text: string } | null>(null)

  const sendTest = async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      const res = await fetch("/api/admin/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setTestMsg(json.sent ? { ok: true, text: `Test email sent to ${json.to}. Check the inbox (and spam).` } : { ok: false, text: `Not sent: ${json.error}. The message was logged to the server console instead.` })
    } catch (err) {
      setTestMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" })
    } finally {
      setTesting(false)
    }
  }

  const recipientCount = !data ? 0 : audience === "all" ? data.audience.all : audience === "users" ? data.audience.users : audience === "admins" ? data.audience.admins : audience === "selected" ? selectedUsers.length : 1

  const send = async () => {
    setSending(true)
    setSendMsg(null)
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          to: audience === "email" ? email.trim() : audience,
          userIds: audience === "selected" ? selectedUsers.map((u) => u.id) : undefined,
          subject,
          body: message,
          ctaLabel,
          ctaUrl,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to send")
      setConfirm(false)
      if (json.sent === 0 && json.failed.length) {
        setSendMsg({ ok: false, text: `0 of ${json.requested} delivered — SMTP isn't configured or rejected the send. Messages were logged to the server console.` })
      } else {
        setSendMsg({ ok: true, text: `Sent to ${json.sent} of ${json.requested} recipient${json.requested === 1 ? "" : "s"}${json.failed.length ? ` (failed: ${json.failed.join(", ")})` : ""}.` })
        setSubject("")
        setMessage("")
        setCtaLabel("")
        setCtaUrl("")
      }
    } catch (err) {
      setSendMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to send" })
    } finally {
      setSending(false)
    }
  }

  if (loading || !data) return <Skeleton rows={3} />

  const ok = data.configured && data.connection.ok

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Communications" subtitle="Email delivery status and messages to your users" right={refreshing ? <span className="text-[11px] text-muted-foreground">Checking…</span> : undefined} />

      {/* Status */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${ok ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]"}`} />
            <div>
              <div className="text-sm font-medium text-foreground">{ok ? "Email delivery is working" : data.configured ? "SMTP configured, but the connection failed" : "Email is not configured"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {ok
                  ? `Connected to ${data.host}:${data.port}${data.secure ? " (TLS)" : ""}. Sending as ${data.from}.`
                  : data.configured
                    ? data.connection.error
                    : "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in the server environment. Until then, every email is printed to the server log instead of delivered."}
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2">
                <div className="flex gap-2"><dt className="text-muted-foreground">From</dt><dd className="font-mono text-foreground">{data.from}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground">Links point to</dt><dd className="font-mono text-foreground">{data.appUrl}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground">Admin notices</dt><dd className="font-mono text-foreground">{data.adminEmail || "— (set ADMIN_EMAIL)"}</dd></div>
                <div className="flex gap-2"><dt className="text-muted-foreground">Audience</dt><dd className="text-foreground">{data.audience.users} users · {data.audience.admins} admins</dd></div>
              </dl>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button onClick={() => refresh()} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Re-check</button>
            <button onClick={sendTest} disabled={testing} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {testing ? "Sending…" : "Send me a test email"}
            </button>
          </div>
        </div>
        {testMsg && <p className={`mt-3 text-xs ${testMsg.ok ? "text-[var(--color-success)]" : "text-destructive"}`}>{testMsg.text}</p>}
      </Card>

      {/* Automatic emails */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Automatic emails</h3>
          <span className="text-[11px] text-muted-foreground">Click “Preview” to open the template with sample data</span>
        </div>
        <ul className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {[
            ["welcome", "Welcome", "when someone signs up"],
            ["deposit-received", "Deposit received", "to the user as soon as they submit a deposit (pending review)"],
            ["deposit-confirmed", "Deposit confirmed", "when you approve a deposit"],
            ["deposit-rejected", "Deposit not confirmed", "when you reject a deposit"],
            ["cycle-completed", "Cycle completed", "when you mark a cycle completed (payout)"],
            ["login-code", "Sign-in code", "6-digit two-step code at every sign-in (when the investor has it on)"],
            ["two-factor-on", "Two-step on / off", "confirmation when the setting changes"],
            ["password-reset", "Password reset link", "from “Forgot password” (1-hour, single-use)"],
            ["password-changed", "Password changed", "after a reset or a change from the profile"],
            ["account-created", "Account activation", "when you add a user (set-your-password link, 72h)"],
            ["password-reset-admin", "Password reset by admin", "choose-a-new-password link (24h) when you reset someone"],
            ["admin-new-deposit", "New deposit request", `to ${data.adminEmail || "ADMIN_EMAIL"} for every submission`],
            ["custom", "Your messages", "what the compose form below sends"],
          ].map(([key, t, d]) => (
            <li key={key} className="flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2">
              <span className="text-[var(--color-success)]">✓</span>
              <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{t}</span> — {d}</span>
              <a href={`/api/admin/mail/preview?key=${key}`} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-foreground hover:underline">Preview</a>
            </li>
          ))}
        </ul>
      </Card>

      {/* Compose */}
      <Card className="p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-medium text-foreground">Message your users</h3>
        <p className="mb-4 text-xs text-muted-foreground">Sent with the AlphaReserve email design. Plain text — a blank line starts a new paragraph.</p>

        {sendMsg && (
          <div className={`mb-4 rounded-lg border p-3 text-xs ${sendMsg.ok ? "border-[var(--color-success)]/25 bg-[var(--bg-success)] text-foreground" : "border-destructive/25 bg-[var(--bg-danger)] text-destructive"}`}>{sendMsg.text}</div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">To</label>
              <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                <option value="users">All investors ({data.audience.users})</option>
                <option value="all">Everyone incl. admins ({data.audience.all})</option>
                <option value="admins">Admins only ({data.audience.admins})</option>
                <option value="selected">Selected investors{selectedUsers.length ? ` (${selectedUsers.length})` : "…"}</option>
                <option value="email">A single email address</option>
              </select>
            </div>
            {audience === "selected" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-foreground">Choose investors</label>
                <UserPicker selected={selectedUsers} onChange={setSelectedUsers} />
              </div>
            )}
            {audience === "email" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Email address</label>
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Subject</label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="e.g. Weekly pool closes Friday" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Message</label>
            <textarea className={`${inputCls} min-h-[160px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} placeholder="Hi everyone,&#10;&#10;…" />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{message.length}/5000</div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Button label <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input className={inputCls} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={60} placeholder="Open dashboard" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Button link</label>
              <input className={inputCls} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder={`${data.appUrl}/app`} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-muted-foreground">
              {ok ? `Will deliver to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.` : "Email isn't configured — sends will only be logged on the server."}
            </span>
            {!confirm ? (
              <button
                onClick={() => setConfirm(true)}
                disabled={subject.trim().length < 2 || message.trim().length < 2 || (audience === "email" && !email.includes("@")) || (audience === "selected" && selectedUsers.length === 0)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Review & send
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground">Send “{subject.trim()}” to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}?</span>
                <button onClick={() => setConfirm(false)} disabled={sending} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
                <button onClick={send} disabled={sending} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{sending ? "Sending…" : "Send now"}</button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
