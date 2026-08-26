"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/app/providers/auth-provider"
import { Button, Notice, TextField } from "@/components/ui"
import { AuthFooter, AuthShell, authLinkCls } from "@/app/components/auth-shell"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

export default function SignupPage() {
  const { signUp, verifyTwoFactor, resendTwoFactor } = useAuth()
  const [step, setStep] = React.useState<"details" | "code">("details")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [telegram, setTelegram] = React.useState("")
  // Honeypot: invisible to people, irresistible to form-filling bots.
  const [website, setWebsite] = React.useState("")
  const [code, setCode] = React.useState("")
  const [maskedEmail, setMaskedEmail] = React.useState("")
  const [notice, setNotice] = React.useState("")
  const [resendIn, setResendIn] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  React.useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Every new account verifies its email before it can be used.
      const result = await signUp({ name, email, password, telegram, website })
      setMaskedEmail(result.email || email)
      setStep("code")
      setResendIn(30)
      setNotice(result.emailSent === false ? "We couldn't email the code — contact support." : "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
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
    setNotice("")
    try {
      const r = await resendTwoFactor()
      setResendIn(30)
      setNotice(`A new code was sent to ${r.email || maskedEmail}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code")
    }
  }

  return (
    <AuthShell
      title={step === "code" ? "Verify your email" : "Create your account"}
      subtitle={
        step === "code" ? (
          <>
            We sent a 6-digit code to <span className="font-bold text-foreground">{maskedEmail}</span>. It&apos;s valid for 10 minutes.
          </>
        ) : (
          "Join Elite Forex Hub and grow your portfolio."
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
            {loading ? "Verifying…" : "Verify and continue"}
          </Button>
          <Button type="button" variant="tertiary" size="sm" onClick={handleResend} disabled={resendIn > 0}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </Button>
        </form>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — hidden from people, so anything typed here is a bot. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
        />
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
      )}

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
