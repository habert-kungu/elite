"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/app/providers/auth-provider"
import { Button, Notice, TextField } from "@/components/ui"
import { AuthFooter, AuthShell, authLinkCls } from "@/app/components/auth-shell"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

export default function SignupPage() {
  const { signUp } = useAuth()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [telegram, setTelegram] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Use the auth provider so the user is hydrated in context before redirect.
      await signUp({ name, email, password, telegram })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join Elite Forex Hub and grow your portfolio.">
      {error && (
        <Notice tone="danger" className="mb-4">
          {error}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Full name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          autoComplete="name"
          required
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          required
        />

        <TextField
          label="Telegram"
          name="telegram"
          type="text"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@username"
          help="Optional — used to reach you about your account."
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={6}
          help="At least 6 characters."
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="-mr-1 flex h-6 w-6 items-center justify-center rounded-[4px] text-less transition-colors hover:text-foreground"
            >
              {showPassword ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
            </button>
          }
        />

        <Button type="submit" block loading={loading}>
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[12px] leading-[18px] text-less">
        By creating an account, you agree to our{" "}
        <a href="#" className={authLinkCls}>Terms</a>
      </p>

      <AuthFooter className="mt-4">
        Already have an account?{" "}
        <Link href="/login" className={authLinkCls}>
          Sign in
        </Link>
      </AuthFooter>
    </AuthShell>
  )
}
