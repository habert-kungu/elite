"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@/app/providers/auth-provider"

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
    <div className="min-h-screen bg-background flex">
      {/* Left side - cartoon illustration */}
      <div className="hidden lg:flex lg:w-[45%] bg-[oklch(0.145_0_0)] relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.145_0_0)] via-[oklch(0.145_0_0)/0.7] to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-between p-8 w-full">
          <div />

          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <svg className="w-8 h-8 text-white" viewBox="0 0 44 45" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M18.4201 9.7905C19.2053 10.2438 19.4743 11.2477 19.021 12.0329L10.8134 26.2488C10.3601 27.034 9.35616 27.3029 8.57104 26.8497C7.78592 26.3964 7.51689 25.3924 7.9702 24.6073L16.1778 10.3913C16.6311 9.60622 17.635 9.33722 18.4201 9.7905ZM27.7561 13.3169C28.5412 13.7702 28.8102 14.7741 28.3569 15.5592L18.5078 32.6184C18.0545 33.4035 17.0506 33.6725 16.2655 33.2192C15.4803 32.7659 15.2113 31.762 15.6646 30.9769L25.5137 13.9177C25.967 13.1326 26.9709 12.8636 27.7561 13.3169ZM36.7357 20.7424C37.2646 19.8265 37.0569 18.7165 36.2717 18.2632C35.4866 17.8099 34.4214 18.185 33.8926 19.1009L24.317 35.6862C23.7882 36.6022 23.9959 37.7122 24.7811 38.1655C25.5662 38.6188 26.6314 38.2437 27.1602 37.3277L36.7357 20.7424Z" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Welcome Back</h2>
            <p className="text-white/60 text-sm max-w-sm mx-auto">
              Sign in to access your portfolio
            </p>
          </div>

          <div className="flex items-center justify-between text-white/40 text-xs">
            <span>© 2026 AlphaReserve</span>
            <span>Secure</span>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-background" viewBox="0 0 44 45" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.4201 9.7905C19.2053 10.2438 19.4743 11.2477 19.021 12.0329L10.8134 26.2488C10.3601 27.034 9.35616 27.3029 8.57104 26.8497C7.78592 26.3964 7.51689 25.3924 7.9702 24.6073L16.1778 10.3913C16.6311 9.60622 17.635 9.33722 18.4201 9.7905ZM27.7561 13.3169C28.5412 13.7702 28.8102 14.7741 28.3569 15.5592L18.5078 32.6184C18.0545 33.4035 17.0506 33.6725 16.2655 33.2192C15.4803 32.7659 15.2113 31.762 15.6646 30.9769L25.5137 13.9177C25.967 13.1326 26.9709 12.8636 27.7561 13.3169ZM36.7357 20.7424C37.2646 19.8265 37.0569 18.7165 36.2717 18.2632C35.4866 17.8099 34.4214 18.185 33.8926 19.1009L24.317 35.6862C23.7882 36.6022 23.9959 37.7122 24.7811 38.1655C25.5662 38.6188 26.6314 38.2437 27.1602 37.3277L36.7357 20.7424Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="text-lg font-semibold text-foreground">AlphaReserve</span>
            </Link>
          </div>

          <h1 className="text-xl font-bold text-foreground mb-1">{step === "code" ? "Check your email" : "Sign in"}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {step === "code" ? <>We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>. It's valid for 10 minutes.</> : "Enter your credentials"}
          </p>

          {notice && !error && (
            <div className="mb-4 rounded-lg border border-[var(--color-success)]/25 bg-[var(--bg-success)] p-3 text-xs text-foreground">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-[var(--bg-danger)] border border-destructive/25 rounded-lg text-destructive text-xs">
              {error}
            </div>
          )}

          {step === "code" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors text-center font-mono text-lg tracking-[0.4em]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? "Verifying…" : "Verify and sign in"}
              </button>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" onClick={handleResend} disabled={resendIn > 0} className="hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60">
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                </button>
                <button type="button" onClick={() => { setStep("password"); setCode(""); setError(""); setNotice("") }} className="hover:text-foreground">
                  Use a different account
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors text-sm"
                required
              />
              <div className="flex justify-end mt-1.5">
                <Link href="/forgot-password" className="text-xs text-foreground hover:underline">
                  Forgot?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          )}

          <div className="mt-5 text-center">
            <p className="text-muted-foreground text-sm">
              No account?{" "}
              <Link href="/signup" className="text-foreground font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}