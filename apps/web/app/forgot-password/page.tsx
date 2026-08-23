"use client"

import * as React from "react"
import Link from "next/link"
import { AuthShell, authInputCls, authButtonCls } from "@/app/components/auth-shell"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [sent, setSent] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Something went wrong")
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell heading="Forgot your password?" tagline="No problem — we'll email you a secure link to choose a new one." title="Reset password" subtitle="Enter the email on your account">
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-success)]/25 bg-[var(--bg-success)] p-4 text-sm text-foreground">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on its way. It expires in 1 hour.
            </p>
          </div>
          <button onClick={() => setSent(false)} className="text-xs text-muted-foreground hover:text-foreground">
            Didn't get it? Try again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg border border-destructive/25 bg-[var(--bg-danger)] p-3 text-xs text-destructive">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={authInputCls} required autoFocus />
          </div>
          <button type="submit" disabled={loading} className={authButtonCls}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <div className="mt-5 text-center">
        <p className="text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  )
}
