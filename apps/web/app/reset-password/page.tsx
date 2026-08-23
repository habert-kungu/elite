"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthShell, authInputCls, authButtonCls } from "@/app/components/auth-shell"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = React.useState<string | null>(null)
  const [welcome, setWelcome] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)

  // Read the token on the client so this page can be statically rendered.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get("token") || "")
    setWelcome(params.get("welcome") === "1")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Something went wrong")
      setDone(true)
      setTimeout(() => router.push("/login?reset=1"), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heading={welcome ? "Welcome to AlphaReserve" : "Choose a new password"}
      tagline={welcome ? "Set your password to activate your account, then sign in to your dashboard." : "Pick something you haven't used before. You'll be signed in fresh afterwards."}
      title={welcome ? "Set your password" : "New password"}
      subtitle="Must be at least 6 characters"
    >
      {token === "" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-3 text-xs text-destructive">
            This reset link is missing its token. Open the link from your email, or request a new one.
          </div>
          <Link href="/forgot-password" className={`${authButtonCls} block text-center`}>Request a new link</Link>
        </div>
      ) : done ? (
        <div className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--bg-success)] p-4 text-sm text-foreground">
          <p className="font-medium">Password updated</p>
          <p className="mt-1 text-xs text-muted-foreground">Taking you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-3 text-xs text-destructive">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={authInputCls} required minLength={6} autoFocus autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={authInputCls} required minLength={6} autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading || token === null} className={authButtonCls}>
            {loading ? "Saving…" : welcome ? "Activate account" : "Update password"}
          </button>
        </form>
      )}
      <div className="mt-5 text-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">Back to sign in</Link>
        </p>
      </div>
    </AuthShell>
  )
}
