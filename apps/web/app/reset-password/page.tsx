"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, ButtonLink, Notice, TextField } from "@/components/ui"
import { AuthFooter, AuthShell, authLinkCls } from "@/app/components/auth-shell"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = React.useState<string | null>(null)
  const [welcome, setWelcome] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

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

  const eyeToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      className="-mr-1 flex h-6 w-6 items-center justify-center rounded-[4px] text-less transition-colors hover:text-foreground"
    >
      {showPassword ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
    </button>
  )

  return (
    <AuthShell
      heading={welcome ? "Welcome to Elite Forex Hub" : "Choose a new password"}
      tagline={welcome ? "Set your password to activate your account, then sign in to your dashboard." : "Pick something you haven't used before. You'll be signed in fresh afterwards."}
      title={welcome ? "Set your password" : "Set a new password"}
      subtitle={welcome ? "Set your password to activate your account, then sign in to your dashboard." : "Pick something you haven't used before. You'll be signed in fresh afterwards."}
    >
      {token === "" ? (
        <div className="space-y-4">
          <Notice tone="danger">
            This reset link is missing its token. Open the link from your email, or request a new one.
          </Notice>
          <ButtonLink href="/forgot-password" block>Request a new link</ButtonLink>
        </div>
      ) : done ? (
        <Notice tone="success">
          <p className="font-bold">Password updated</p>
          <p className="mt-1 text-less">Taking you to sign in…</p>
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <TextField
            label="New password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoFocus
            autoComplete="new-password"
            help="Must be at least 6 characters."
            trailing={eyeToggle}
          />
          <TextField
            label="Confirm password"
            name="confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete="new-password"
            trailing={eyeToggle}
          />
          <Button type="submit" block loading={loading} disabled={token === null}>
            {loading ? "Saving…" : welcome ? "Activate account" : "Update password"}
          </Button>
        </form>
      )}
      <AuthFooter>
        <Link href="/login" className={authLinkCls}>Back to sign in</Link>
      </AuthFooter>
    </AuthShell>
  )
}
