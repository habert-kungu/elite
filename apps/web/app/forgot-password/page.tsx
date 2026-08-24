"use client"

import * as React from "react"
import Link from "next/link"
import { Button, Notice, TextField } from "@/components/ui"
import { AuthFooter, AuthShell, authLinkCls } from "@/app/components/auth-shell"

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
    <AuthShell heading="Forgot your password?" tagline="No problem — we'll email you a secure link to choose a new one." title="Forgot your password?" subtitle="Enter the email on your account and we'll send you a secure link to choose a new one.">
      {sent ? (
        <div className="space-y-4">
          <Notice tone="success">
            <p className="font-bold">Check your inbox</p>
            <p className="mt-1 text-less">
              If an account exists for <strong className="font-bold text-foreground">{email}</strong>, a reset link is on its way. It expires in 1 hour.
            </p>
          </Notice>
          <Button type="button" variant="tertiary" size="sm" onClick={() => setSent(false)}>
            Didn&apos;t get it? Try again
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <TextField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
            autoFocus
          />
          <Button type="submit" block loading={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <AuthFooter>
        Remembered it?{" "}
        <Link href="/login" className={authLinkCls}>Sign in</Link>
      </AuthFooter>
    </AuthShell>
  )
}
