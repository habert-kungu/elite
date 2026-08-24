"use client"

import * as React from "react"
import { Badge, Button, ButtonLink, Card, CardHeader, Notice, Skeleton, Tabs, TextField } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { useAuth } from "@/app/providers/auth-provider"
import { useCachedFetch, invalidateCache } from "@/lib/use-cached-fetch"
import {
  IconAlertTriangle,
  IconBrandTelegram,
  IconCalendar,
  IconCircleCheck,
  IconDevices,
  IconMail,
  IconRosetteDiscountCheckFilled,
} from "@tabler/icons-react"

interface Profile {
  user: { id: string; email: string; name: string | null; telegram: string | null; walletAddress: string | null; role: string; createdAt: string }
  stats: { totalDeposits: number; totalReturns: number; activeInvestments: number; completedCycles: number }
}

type Section = "details" | "security"

const SECTIONS: { value: Section; label: string }[] = [
  { value: "details", label: "Personal details" },
  { value: "security", label: "Security" },
]

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

/** Inline status message: success or danger notice with the matching icon. */
function StatusNotice({ msg }: { msg: { tone: "ok" | "err"; text: string } | null }) {
  if (!msg) return null
  return (
    <Notice tone={msg.tone === "ok" ? "success" : "danger"} icon={msg.tone === "ok" ? <IconCircleCheck className="h-4 w-4" stroke={1.8} /> : <IconAlertTriangle className="h-4 w-4" stroke={1.8} />}>
      {msg.text}
    </Notice>
  )
}

/** One cell of the account summary strip. */
function SummaryCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "success" }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <div className="text-[12px] leading-[18px] text-less">{label}</div>
      <div className={`mt-0.5 truncate text-[20px] font-bold leading-[30px] tabular-nums md:text-[24px] md:leading-9 ${tone === "success" ? "text-success" : "text-foreground"}`}>{value}</div>
    </div>
  )
}

export default function ProfilePage() {
  const { user: session, setUser } = useAuth()
  const { data, loading, refresh, setData } = useCachedFetch<Profile>(session ? "/api/user/profile" : null, { ttl: 60_000 })

  const [section, setSection] = React.useState<Section>("details")

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
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-48 w-full rounded-[16px]" />
        <Skeleton className="h-64 w-full rounded-[16px]" />
      </div>
    )
  }

  const p = data.user
  const joined = new Date(p.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const displayName = p.name || p.email.split("@")[0]

  return (
    <div className="space-y-6">
      <PageHeader title="Account settings" description="Manage your personal details, security and signed-in devices." />

      <Tabs items={SECTIONS} value={section} onChange={setSection} />

      {section === "details" && (
        <div className="space-y-4 animate-fade-up">
          {/* Identity + summary strip */}
          <Card className="overflow-hidden">
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[18px] font-bold text-primary-foreground sm:h-16 sm:w-16 sm:text-[20px]">
                {initials(p.name, p.email)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-bold leading-6 text-foreground md:text-[20px] md:leading-[30px]">{displayName}</h2>
                  {tfa?.enabled && (
                    <IconRosetteDiscountCheckFilled
                      className="h-5 w-5 text-info"
                      aria-label="Verified account — two-step verification is on"
                      title="Verified with two-step verification"
                    />
                  )}
                  {p.role === "admin" && <Badge tone="info">Admin</Badge>}
                </div>
                <p className="text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">{handleFor(p)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">
                  <span className="inline-flex items-center gap-1.5">
                    <IconMail className="h-4 w-4 text-less" stroke={1.8} />
                    {p.email}
                  </span>
                  {p.telegram && (
                    <a href={`https://t.me/${p.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
                      <IconBrandTelegram className="h-4 w-4 text-less" stroke={1.8} />
                      {handleFor(p)}
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <IconCalendar className="h-4 w-4 text-less" stroke={1.8} />
                    Joined {joined}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--background-hover)] border-t border-[var(--background-hover)] sm:grid-cols-4 sm:divide-y-0">
              <SummaryCell label="Deposited" value={`$${data.stats.totalDeposits.toLocaleString()}`} />
              <SummaryCell label="Returns" value={`$${data.stats.totalReturns.toLocaleString()}`} tone="success" />
              <SummaryCell label="Active" value={data.stats.activeInvestments} />
              <SummaryCell label="Completed" value={data.stats.completedCycles} />
            </div>
          </Card>

          {/* Personal details */}
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Personal details"
              description="Your display name, Telegram handle and payout wallet."
              action={!editing && <Button variant="secondary" size="sm" onClick={startEdit}>Edit</Button>}
            />
            {msg && <div className="mt-4"><StatusNotice msg={msg} /></div>}

            {!editing ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Display name" name="view-name" value={p.name || ""} placeholder="—" readOnly />
                <TextField label="Telegram" name="view-telegram" value={p.telegram || ""} placeholder="—" readOnly />
                <TextField label="USDT wallet (TRC20)" name="view-wallet" value={p.walletAddress || ""} placeholder="—" readOnly inputClassName="font-mono" help="Used for withdrawals." className="sm:col-span-2" />
                <TextField label="Email" name="view-email" value={p.email} disabled help="Contact support to change the email on your account." className="sm:col-span-2" />
              </div>
            ) : (
              <form onSubmit={save} className="mt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Display name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={80} />
                  <TextField label="Telegram" name="telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" maxLength={64} />
                  <TextField label="USDT wallet (TRC20)" name="walletAddress" value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} placeholder="T…" maxLength={128} inputClassName="font-mono" help="Used for withdrawals." className="sm:col-span-2" />
                  <TextField label="Email" name="email" value={p.email} disabled help="Contact support to change the email on your account." className="sm:col-span-2" />
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" loading={saving}>Save changes</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {section === "security" && (
        <div className="space-y-4 animate-fade-up">
          {/* Password */}
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Password"
              description="Use at least 6 characters. You'll get an email when it changes."
              action={
                <Button
                  variant={pwOpen ? "tertiary" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setPwMsg(null)
                    setPwOpen((o) => !o)
                  }}
                >
                  {pwOpen ? "Cancel" : "Change password"}
                </Button>
              }
            />
            {pwMsg && <div className="mt-4"><StatusNotice msg={pwMsg} /></div>}
            {pwOpen && (
              <form onSubmit={changePassword} className="mt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Current password" name="current-password" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" className="sm:col-span-2" />
                  <TextField label="New password" name="new-password" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={6} autoComplete="new-password" />
                  <TextField label="Confirm new password" name="confirm-password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={6} autoComplete="new-password" />
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={() => { setPwMsg(null); setPwOpen(false) }} disabled={pwBusy}>Cancel</Button>
                  <Button type="submit" loading={pwBusy}>Update password</Button>
                </div>
              </form>
            )}
          </Card>

          {/* Two-step verification */}
          <Card className="p-5 sm:p-6">
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  Two-step verification
                  {tfa && <Badge tone={tfa.enabled ? "success" : "neutral"} dot>{tfa.enabled ? "On" : "Off"}</Badge>}
                </span>
              }
              description={tfa?.enabled ? "Signing in needs your password and a code we email you." : "Add a second step: a 6-digit code emailed to you at every sign-in."}
              action={
                <>
                  {tfa && tfaStep === "idle" && (
                    <Button
                      variant={tfa.enabled ? "secondary" : "primary"}
                      size="sm"
                      loading={tfaBusy}
                      onClick={() => { setTfaMsg(null); if (tfa.enabled) setTfaStep("disable"); else void startTfa() }}
                    >
                      {tfaBusy ? "Sending…" : tfa.enabled ? "Turn off" : "Turn on"}
                    </Button>
                  )}
                  {tfaStep !== "idle" && (
                    <Button variant="tertiary" size="sm" onClick={() => { setTfaStep("idle"); setTfaMsg(null); setTfaCode(""); setTfaPassword("") }}>Cancel</Button>
                  )}
                </>
              }
            />
            {tfaMsg && <div className="mt-4"><StatusNotice msg={tfaMsg} /></div>}
            {tfaStep === "code" && (
              <form onSubmit={enableTfa} className="mt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Enter the 6-digit code"
                    name="tfa-code"
                    inputClassName="font-mono tracking-[0.3em]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    autoFocus
                  />
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={startTfa} disabled={tfaBusy}>Resend code</Button>
                  <Button type="submit" loading={tfaBusy} disabled={tfaCode.length !== 6}>Turn on</Button>
                </div>
              </form>
            )}
            {tfaStep === "disable" && (
              <form onSubmit={disableTfa} className="mt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Confirm with your password" name="tfa-password" type="password" autoComplete="current-password" value={tfaPassword} onChange={(e) => setTfaPassword(e.target.value)} autoFocus required />
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="submit" variant="danger" loading={tfaBusy} disabled={!tfaPassword}>Turn off two-step</Button>
                </div>
              </form>
            )}
          </Card>

          {/* Sessions */}
          <Card className="p-5 sm:p-6">
            <CardHeader title="Signed-in devices" description="Signed in somewhere you don't recognise? End every session except this one." />
            {revokeMsg && <div className="mt-4"><StatusNotice msg={revokeMsg} /></div>}
            <div className="mt-5 flex items-center gap-3 rounded-[8px] bg-background p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <IconDevices className="h-4 w-4" stroke={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-foreground">This device</span>
                  <Badge tone="success" dot>Active</Badge>
                </div>
                <div className="text-[12px] leading-[18px] text-less">Your current session stays signed in.</div>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={signOutOthers} loading={revoking}>Sign out other devices</Button>
            </div>
          </Card>

          {/* Forgot password */}
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Forgot your password?"
              description={`We'll email ${p.email} a secure reset link.`}
              action={<ButtonLink href="/forgot-password" variant="tertiary" size="sm">Send link</ButtonLink>}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
