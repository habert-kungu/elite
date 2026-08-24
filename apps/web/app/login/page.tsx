"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/app/providers/auth-provider"
import { Button, Notice, TextField } from "@/components/ui"
import { AuthFooter, AuthShell, authLinkCls } from "@/app/components/auth-shell"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

export default function LoginPage() {
  const { signIn, verifyTwoFactor, resendTwoFactor } = useAuth()
  const [step, setStep] = React.useState<"password" | "code">("password")
  const [maskedEmail, setMaskedEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [resendIn, setResendIn] = React.useState(0)

  React.useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [notice, setNotice] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("reset") === "1") setNotice("Your password was updated. Sign in with your new password.")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Use the auth provider so the user is hydrated in context (the dashboard
      // gates its data fetch on `user`), then it handles the redirect.
      const result = await signIn(email, password)
      if (result.requiresTwoFactor) {
        setMaskedEmail(result.email || "your email")
        setStep("code")
        setResendIn(30)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await verifyTwoFactor(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError("")
    try {
      const r = await resendTwoFactor()
      setMaskedEmail(r.email || maskedEmail)
      setNotice(`A new code was sent to ${r.email || maskedEmail}.`)
      setResendIn(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code")
    }
  }

  return (
    <AuthShell
      title={step === "code" ? "Check your email" : "Welcome back!"}
      subtitle={
        step === "code" ? (
          <>
            We sent a 6-digit code to <span className="font-bold text-foreground">{maskedEmail}</span>. It&apos;s valid for 10 minutes.
          </>
        ) : (
          "Sign in to access your portfolio."
        )
      }
    >
      {notice && !error && (
        <Notice tone="success" className="mb-4">
          {notice}
        </Notice>
      )}
      {error && (
        <Notice tone="danger" className="mb-4">
          {error}
        </Notice>
      )}

      {step === "code" ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <TextField
            label="Verification code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            autoFocus
            required
            inputClassName="text-center text-[18px] font-bold tracking-[0.4em] tabular-nums"
          />
          <Button type="submit" block loading={loading} disabled={code.length !== 6}>
            {loading ? "Verifying…" : "Verify and sign in"}
          </Button>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="tertiary" size="sm" onClick={handleResend} disabled={resendIn > 0}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </Button>
            <Button type="button" variant="tertiary" size="sm" onClick={() => { setStep("password"); setCode(""); setError(""); setNotice("") }}>
              Use a different account
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
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
            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" className={`text-[12px] leading-[18px] md:text-[14px] md:leading-5 ${authLinkCls}`}>
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" block loading={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      )}

      <AuthFooter>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={authLinkCls}>
          Sign up
        </Link>
      </AuthFooter>
    </AuthShell>
  )
}
