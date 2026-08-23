"use client"

import * as React from "react"
import Link from "next/link"
import { Card } from "@/components/ui"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"

interface Profile {
  user: { id: string; email: string; name: string | null; telegram: string | null; walletAddress: string | null; role: string; createdAt: string }
  stats: { totalDeposits: number; totalReturns: number; activeInvestments: number; completedCycles: number }
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"

/** X-style verified check: blue scalloped badge with a white tick. */
export function VerifiedBadge({ className = "h-5 w-5", title = "Verified account" }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-label={title} role="img">
      <title>{title}</title>
      <path
        fill="#1d9bf0"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      <path fill="#fff" d="M10.3 16.1l-3.4-3.4 1.4-1.4 2 2 5.4-5.4 1.4 1.4z" />
    </svg>
  )
}

function initials(name: string | null, email: string) {
  const src = (name || email).trim()
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

function handleFor(p: Profile["user"]) {
  if (p.telegram) return p.telegram.startsWith("@") ? p.telegram : `@${p.telegram}`
  return `@${p.email.split("@")[0]}`
}


export default function ProfilePage() {
  const { user: session, setUser } = useAuth()
  const { data, loading, refresh, setData } = useCachedFetch<Profile>(session ? "/api/user/profile" : null, { ttl: 60_000 })

  const [editing, setEditing] = React.useState(false)
  const [form, setForm] = React.useState({ name: "", telegram: "", walletAddress: "" })
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null)

  const [pwOpen, setPwOpen] = React.useState(false)
  const [pw, setPw] = React.useState({ current: "", next: "", confirm: "" })
  const [pwBusy, setPwBusy] = React.useState(false)
  const [pwMsg, setPwMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null)
  const { data: tfa, setData: setTfa } = useCachedFetch<{ enabled: boolean; email: string }>(session ? "/api/user/2fa" : null, { ttl: 60_000 })
  const [tfaStep, setTfaStep] = React.useState<"idle" | "code" | "disable">("idle")
  const [tfaCode, setTfaCode] = React.useState("")
  const [tfaPassword, setTfaPassword] = React.useState("")
  const [tfaBusy, setTfaBusy] = React.useState(false)
  const [tfaMsg, setTfaMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null)

  const tfaPost = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/user/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Something went wrong")
    return json
  }
  const startTfa = async () => {
    setTfaBusy(true); setTfaMsg(null)
    try {
      const r = await tfaPost({ action: "start" })
      setTfaStep("code")
      setTfaMsg({ tone: "ok", text: r.emailSent ? `We emailed a 6-digit code to ${p?.email ?? "your address"}.` : "Email isn't configured on this server — the code was written to the server log." })
    } catch (err) { setTfaMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed" }) } finally { setTfaBusy(false) }
  }
  const enableTfa = async (e: React.FormEvent) => {
    e.preventDefault(); setTfaBusy(true); setTfaMsg(null)
    try {
      await tfaPost({ action: "enable", code: tfaCode })
      setTfa({ enabled: true, email: tfa?.email ?? "" }); setTfaStep("idle"); setTfaCode("")
      setTfaMsg({ tone: "ok", text: "Two-step verification is on. You'll be asked for an emailed code whenever you sign in." })
    } catch (err) { setTfaMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed" }) } finally { setTfaBusy(false) }
  }
  const disableTfa = async (e: React.FormEvent) => {
    e.preventDefault(); setTfaBusy(true); setTfaMsg(null)
    try {
      await tfaPost({ action: "disable", password: tfaPassword })
      setTfa({ enabled: false, email: tfa?.email ?? "" }); setTfaStep("idle"); setTfaPassword("")
      setTfaMsg({ tone: "ok", text: "Two-step verification is off. Other devices were signed out." })
    } catch (err) { setTfaMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed" }) } finally { setTfaBusy(false) }
  }

  const [revoking, setRevoking] = React.useState(false)
  const [revokeMsg, setRevokeMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null)

  const signOutOthers = async () => {
    setRevoking(true)
    setRevokeMsg(null)
    try {
      const res = await fetch("/api/user/sessions", { method: "POST" })
      if (!res.ok) throw new Error("Couldn't sign out other devices")
      setRevokeMsg({ tone: "ok", text: "Every other device has been signed out. You're still signed in here." })
    } catch (err) {
      setRevokeMsg({ tone: "err", text: err instanceof Error ? err.message : "Something went wrong" })
    } finally {
      setRevoking(false)
    }
  }

  const startEdit = () => {
    if (!data) return
    setForm({ name: data.user.name || "", telegram: data.user.telegram || "", walletAddress: data.user.walletAddress || "" })
    setMsg(null)
    setEditing(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Couldn't save changes")
      if (data) setData({ ...data, user: json.user })
      if (session) setUser({ ...session, name: json.user.name, telegram: json.user.telegram })
      invalidateCache("/api/user/profile")
      setEditing(false)
      setMsg({ tone: "ok", text: "Profile updated" })
    } catch (err) {
      setMsg({ tone: "err", text: err instanceof Error ? err.message : "Couldn't save changes" })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (pw.next !== pw.confirm) {
      setPwMsg({ tone: "err", text: "New passwords don't match" })
      return
    }
    setPwBusy(true)
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Couldn't change password")
      setPw({ current: "", next: "", confirm: "" })
      setPwOpen(false)
      setPwMsg({ tone: "ok", text: "Password changed — all other devices were signed out. A confirmation email is on its way." })
    } catch (err) {
      setPwMsg({ tone: "err", text: err instanceof Error ? err.message : "Couldn't change password" })
    } finally {
      setPwBusy(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const p = data.user
  const joined = new Date(p.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const displayName = p.name || p.email.split("@")[0]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Profile</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Manage your account</p>
        </div>
        <Link href="/app" className="text-xs text-muted-foreground hover:text-foreground">← Back to Dashboard</Link>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground sm:h-16 sm:w-16 sm:text-xl">
              {initials(p.name, p.email)}
            </div>
            {!editing && (
              <button
                onClick={startEdit}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary sm:text-[13px]"
              >
                Edit profile
              </button>
            )}
          </div>

          {!editing ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{displayName}</h2>
                <VerifiedBadge className="h-5 w-5 sm:h-6 sm:w-6" />
                {p.role === "admin" && (
                  <span className="ml-1 rounded-full bg-[var(--bg-info)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-info)]">Admin</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{handleFor(p)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16v16H4z" /><path d="M4 8l8 5 8-5" /></svg>
                  {p.email}
                </span>
                {p.telegram && (
                  <a href={`https://t.me/${p.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5L2.6 10.9c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 11.2-7.1c.5-.3 1-.1.6.2l-9.1 8.2-.3 5c.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8L22.9 5c.3-1.3-.5-1.9-1.4-1.5z" /></svg>
                    {handleFor(p)}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  Joined {joined}
                </span>
              </div>

              {msg && (
                <p className={`mt-3 text-xs ${msg.tone === "ok" ? "text-[var(--color-success)]" : "text-destructive"}`}>{msg.text}</p>
              )}
            </div>
          ) : (
            <form onSubmit={save} className="mt-4 space-y-3">
              {msg?.tone === "err" && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-2.5 text-xs text-destructive">{msg.text}</div>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Display name</label>
                  <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={80} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Telegram</label>
                  <input className={inputCls} value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" maxLength={64} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    USDT wallet (TRC20) <span className="font-normal text-muted-foreground">— used for withdrawals</span>
                  </label>
                  <input className={`${inputCls} font-mono`} value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} placeholder="T…" maxLength={128} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-foreground">Email</label>
                  <input className={`${inputCls} opacity-60`} value={p.email} disabled />
                  <p className="mt-1 text-[11px] text-muted-foreground">Contact support to change the email on your account.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: "Deposited", value: `$${data.stats.totalDeposits.toLocaleString()}` },
            { label: "Returns", value: `$${data.stats.totalReturns.toLocaleString()}`, cls: "text-[var(--color-success)]" },
            { label: "Active", value: data.stats.activeInvestments },
            { label: "Completed", value: data.stats.completedCycles },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center sm:py-4">
              <div className={`text-base font-medium tabular-nums sm:text-lg ${s.cls || "text-foreground"}`}>{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Security */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-medium text-foreground sm:text-base">Security</h2>
        <div className="space-y-3">
          <div className="rounded-lg bg-secondary/50 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground sm:text-sm">Password</div>
                <div className="text-[10px] text-muted-foreground sm:text-xs">Use at least 6 characters. You'll get an email when it changes.</div>
              </div>
              <button
                onClick={() => {
                  setPwMsg(null)
                  setPwOpen((o) => !o)
                }}
                className="text-xs font-medium text-foreground hover:underline sm:text-sm"
              >
                {pwOpen ? "Cancel" : "Change"}
              </button>
            </div>
            {pwMsg && <p className={`mt-2 text-xs ${pwMsg.tone === "ok" ? "text-[var(--color-success)]" : "text-destructive"}`}>{pwMsg.text}</p>}
            {pwOpen && (
              <form onSubmit={changePassword} className="mt-3 grid grid-cols-1 gap-3 border-t border-border/60 pt-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Current password</label>
                  <input className={inputCls} type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">New password</label>
                  <input className={inputCls} type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} autoComplete="new-password" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Confirm new password</label>
                  <input className={inputCls} type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={6} autoComplete="new-password" />
                </div>
                <div className="flex justify-end sm:col-span-3">
                  <button type="submit" disabled={pwBusy} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {pwBusy ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-lg bg-secondary/50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground sm:text-sm">
                  Two-step verification
                  {tfa && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tfa.enabled ? "bg-[var(--bg-success)] text-[var(--color-success)]" : "bg-secondary text-muted-foreground"}`}>{tfa.enabled ? "On" : "Off"}</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground sm:text-xs">{tfa?.enabled ? "Signing in needs your password and a code we email you." : "Add a second step: a 6-digit code emailed to you at every sign-in."}</div>
              </div>
              {tfa && tfaStep === "idle" && (
                <button
                  onClick={() => { setTfaMsg(null); if (tfa.enabled) setTfaStep("disable"); else void startTfa() }}
                  disabled={tfaBusy}
                  className="text-xs font-medium text-foreground hover:underline disabled:opacity-50 sm:text-sm"
                >
                  {tfaBusy ? "Sending…" : tfa.enabled ? "Turn off" : "Turn on"}
                </button>
              )}
              {tfaStep !== "idle" && (
                <button onClick={() => { setTfaStep("idle"); setTfaMsg(null); setTfaCode(""); setTfaPassword("") }} className="text-xs font-medium text-muted-foreground hover:text-foreground sm:text-sm">Cancel</button>
              )}
            </div>
            {tfaMsg && <p className={`mt-2 text-xs ${tfaMsg.tone === "ok" ? "text-[var(--color-success)]" : "text-destructive"}`}>{tfaMsg.text}</p>}
            {tfaStep === "code" && (
              <form onSubmit={enableTfa} className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-foreground">Enter the 6-digit code</label>
                  <input className={`${inputCls} font-mono tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={tfaCode} onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" autoFocus />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={startTfa} disabled={tfaBusy} className="rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">Resend</button>
                  <button type="submit" disabled={tfaBusy || tfaCode.length !== 6} className="rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50">{tfaBusy ? "Checking…" : "Turn on"}</button>
                </div>
              </form>
            )}
            {tfaStep === "disable" && (
              <form onSubmit={disableTfa} className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-foreground">Confirm with your password</label>
                  <input className={inputCls} type="password" autoComplete="current-password" value={tfaPassword} onChange={(e) => setTfaPassword(e.target.value)} autoFocus required />
                </div>
                <button type="submit" disabled={tfaBusy || !tfaPassword} className="rounded-lg bg-destructive px-4 py-2.5 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">{tfaBusy ? "Turning off…" : "Turn off two-step"}</button>
              </form>
            )}
          </div>

          <div className="rounded-lg bg-secondary/50 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground sm:text-sm">Other devices</div>
                <div className="text-[10px] text-muted-foreground sm:text-xs">Signed in somewhere you don't recognise? End every session except this one.</div>
              </div>
              <button onClick={signOutOthers} disabled={revoking} className="text-xs font-medium text-foreground hover:underline disabled:opacity-50 sm:text-sm">
                {revoking ? "Working…" : "Sign out other devices"}
              </button>
            </div>
            {revokeMsg && <p className={`mt-2 text-xs ${revokeMsg.tone === "ok" ? "text-[var(--color-success)]" : "text-destructive"}`}>{revokeMsg.text}</p>}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 sm:p-4">
            <div>
              <div className="text-xs font-medium text-foreground sm:text-sm">Forgot your password?</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">We'll email {p.email} a secure reset link.</div>
            </div>
            <Link href="/forgot-password" className="text-xs font-medium text-foreground hover:underline sm:text-sm">Send link</Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
