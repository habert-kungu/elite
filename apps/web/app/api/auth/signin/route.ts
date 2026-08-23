import { NextRequest, NextResponse } from "next/server"
import { validateUser, setSessionCookie, createTwoFactorCode, createMfaChallenge, setMfaCookie, maskEmail } from "@/lib/auth"
import { loginCodeEmail } from "@/lib/mail"
import { checkRateLimit, getRateLimitResetSeconds, clearRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const rateLimitKey = `login:${String(email).toLowerCase()}`
    const rateLimit = checkRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
      const waitSeconds = getRateLimitResetSeconds(rateLimit.resetTime)
      return NextResponse.json({ error: `Too many login attempts. Please try again in ${waitSeconds} seconds.` }, { status: 429 })
    }

    const user = await validateUser(email, password)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    clearRateLimit(rateLimitKey)

    if (user.twoFactorEnabled) {
      // Password accepted; hold the session behind a short-lived challenge and
      // email a one-time code. The real session cookie is only set by /2fa/verify.
      const code = await createTwoFactorCode(user.id, "login")
      const mail = await loginCodeEmail(user.email, code, { purpose: "login", name: user.name })
      const challenge = await createMfaChallenge(user)
      const res = NextResponse.json({ requiresTwoFactor: true, email: maskEmail(user.email), emailSent: mail.sent })
      return setMfaCookie(res, challenge)
    }

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, telegram: user.telegram },
    })
    return setSessionCookie(response, user)
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
