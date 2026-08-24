"use client"

import * as React from "react"
import { Badge, Button, Card, CardHeader, Modal, Notice, Select, TextArea, TextField, buttonClass } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useCachedFetch } from "@/lib/use-cached-fetch"
import { cn } from "@workspace/ui/lib/utils"
import { IconAlertTriangle, IconCheck, IconCircleCheck, IconExternalLink, IconMailForward, IconSearch, IconX } from "@tabler/icons-react"
import { Skeleton } from "../_components"

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
    <div className="overflow-hidden rounded-[8px] border border-border">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <TextField
          className="flex-1"
          name="picker-search"
          type="search"
          aria-label="Search investors"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search investors by name, email or Telegram…"
          leading={<IconSearch className="h-4 w-4" stroke={1.8} />}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-shrink-0"
          onClick={() => onChange(allVisibleOn ? selected.filter((u) => !visibleIds.includes(u.id)) : [...selected, ...users.filter((u) => !isOn(u.id))])}
        >
          {allVisibleOn ? "Unselect shown" : "Select shown"}
        </Button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
          {selected.map((u) => (
            <Badge key={u.id} tone="neutral">
              {u.name || u.email}
              <button type="button" onClick={() => toggle(u)} className="-mr-1 flex h-4 w-4 items-center justify-center rounded-[2px] text-less hover:text-foreground" aria-label={`Remove ${u.email}`}>
                <IconX className="h-3 w-3" stroke={2} />
              </button>
            </Badge>
          ))}
          <Button type="button" variant="tertiary" size="xs" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      )}
      <div className="max-h-56 overflow-y-auto">
        {loading && <p className="p-3 text-[12px] text-less">Loading…</p>}
        {!loading && users.length === 0 && <p className="p-3 text-[12px] text-less">No users match.</p>}
        {users.map((u) => (
          <label key={u.id} className="flex h-12 cursor-pointer items-center gap-3 px-3 text-[14px] transition-colors hover:bg-hover">
            <input type="checkbox" checked={isOn(u.id)} onChange={() => toggle(u)} className="h-4 w-4 accent-[var(--primary)]" />
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-active text-[11px] font-bold text-foreground">{(u.name || u.email).charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-foreground">{u.name || "—"}</span>
              <span className="block truncate text-[12px] leading-[18px] text-less">{u.email}</span>
            </span>
            {u.role === "admin" && <Badge tone="info">Admin</Badge>}
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
  const canSend = !(subject.trim().length < 2 || message.trim().length < 2 || (audience === "email" && !email.includes("@")) || (audience === "selected" && selectedUsers.length === 0))

  return (
    <div className="space-y-6">
      <PageHeader title="Communications" description="Email delivery status and messages to your users" actions={refreshing ? <span className="text-[12px] text-less">Checking…</span> : undefined} />

      {/* Status */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Badge tone={ok ? "success" : "warning"} dot className="mt-0.5 flex-shrink-0">
              {ok ? "Connected" : data.configured ? "Connection failed" : "Not configured"}
            </Badge>
            <div className="min-w-0">
              <div className="text-[16px] font-bold leading-6 text-foreground">{ok ? "Email delivery is working" : data.configured ? "SMTP configured, but the connection failed" : "Email is not configured"}</div>
              <div className="mt-0.5 text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">
                {ok
                  ? `Connected to ${data.host}:${data.port}${data.secure ? " (TLS)" : ""}. Sending as ${data.from}.`
                  : data.configured
                    ? data.connection.error
                    : "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in the server environment. Until then, every email is printed to the server log instead of delivered."}
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12px] leading-[18px] sm:grid-cols-2">
                <div className="flex gap-2"><dt className="flex-shrink-0 text-less">From</dt><dd className="truncate font-mono text-foreground">{data.from}</dd></div>
                <div className="flex gap-2"><dt className="flex-shrink-0 text-less">Links point to</dt><dd className="truncate font-mono text-foreground">{data.appUrl}</dd></div>
                <div className="flex gap-2"><dt className="flex-shrink-0 text-less">Admin notices</dt><dd className="truncate font-mono text-foreground">{data.adminEmail || "— (set ADMIN_EMAIL)"}</dd></div>
                <div className="flex gap-2"><dt className="flex-shrink-0 text-less">Audience</dt><dd className="text-foreground">{data.audience.users} users · {data.audience.admins} admins</dd></div>
              </dl>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => refresh()}>
              Re-check
            </Button>
            <Button size="sm" onClick={sendTest} loading={testing} disabled={testing}>
              {testing ? "Sending…" : "Send me a test email"}
            </Button>
          </div>
        </div>
        {testMsg && (
          <Notice tone={testMsg.ok ? "success" : "danger"} className="mt-4" icon={testMsg.ok ? <IconCircleCheck className="h-4 w-4" stroke={1.8} /> : <IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
            {testMsg.text}
          </Notice>
        )}
      </Card>

      {/* Automatic emails */}
      <Card className="overflow-hidden">
        <CardHeader className="p-5 pb-3 sm:px-6" title="Automatic emails" description="Open any template with sample data to check how it renders." />
        <ul className="divide-y divide-[var(--background-hover)]">
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
            <li key={key} className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <IconCheck className="h-3.5 w-3.5" stroke={2.2} />
              </span>
              <span className="min-w-0 flex-1 text-[12px] leading-[18px] md:text-[14px] md:leading-5">
                <span className="font-bold text-foreground">{t}</span>
                <span className="text-less"> — {d}</span>
              </span>
              <a href={`/api/admin/mail/preview?key=${key}`} target="_blank" rel="noreferrer" className={buttonClass({ variant: "tertiary", size: "xs", className: "flex-shrink-0" })}>
                Preview
                <IconExternalLink className="h-3.5 w-3.5" stroke={1.8} />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      {/* Compose */}
      <Card className="p-5 sm:p-6">
        <CardHeader title="Message your users" description="Sent with the Elite Forex Hub email design. Plain text — a blank line starts a new paragraph." />

        {sendMsg && (
          <Notice tone={sendMsg.ok ? "success" : "danger"} className="mt-4" icon={sendMsg.ok ? <IconCircleCheck className="h-4 w-4" stroke={1.8} /> : <IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
            {sendMsg.text}
          </Notice>
        )}

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="To" name="audience" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="users">All investors ({data.audience.users})</option>
              <option value="all">Everyone incl. admins ({data.audience.all})</option>
              <option value="admins">Admins only ({data.audience.admins})</option>
              <option value="selected">Selected investors{selectedUsers.length ? ` (${selectedUsers.length})` : "…"}</option>
              <option value="email">A single email address</option>
            </Select>
            {audience === "selected" && (
              <div className="sm:col-span-2">
                <span className="field-label">Choose investors</span>
                <UserPicker selected={selectedUsers} onChange={setSelectedUsers} />
              </div>
            )}
            {audience === "email" && (
              <TextField label="Email address" name="recipient" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            )}
          </div>
          <TextField label="Subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} placeholder="e.g. Pro 5 days plan closes Friday" />
          <TextArea
            label="Message"
            name="message"
            inputClassName="min-h-[160px] resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            placeholder="Hi everyone,&#10;&#10;…"
            help={<span className="block text-right tabular-nums">{message.length}/5000</span>}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Button label" name="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={60} placeholder="Open dashboard" help="Optional" />
            <TextField label="Button link" name="ctaUrl" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder={`${data.appUrl}/app`} />
          </div>
          <div className="flex flex-col gap-3 border-t border-[var(--background-hover)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[12px] leading-[18px] text-less">
              {ok ? `Will deliver to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.` : "Email isn't configured — sends will only be logged on the server."}
            </span>
            <Button onClick={() => setConfirm(true)} disabled={!canSend}>
              <IconMailForward className="h-4 w-4" stroke={1.8} />
              Review & send
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={confirm}
        onClose={() => !sending && setConfirm(false)}
        title="Send message"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={send} loading={sending} disabled={sending}>
              {sending ? "Sending…" : "Send now"}
            </Button>
          </>
        }
      >
        <p>
          Send <strong className="font-bold text-foreground">“{subject.trim()}”</strong> to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}?
        </p>
        {!ok && (
          <Notice tone="warning" className="mt-4" icon={<IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
            Email isn't configured, so this will only be logged on the server.
          </Notice>
        )}
      </Modal>
    </div>
  )
}
