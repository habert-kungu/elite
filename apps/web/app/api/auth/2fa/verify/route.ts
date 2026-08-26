import { NextRequest, NextResponse } from "next/server"
import { readMfaChallenge, verifyTwoFactorCode, setSessionCookie, clearMfaCookie, setTrustedDeviceCookie } from "@/lib/auth"
import prisma from "@/lib/db"

/** POST { code } — completes a two-step sign-in started by /api/auth/signin. */
export async function POST(request: NextRequest) {
  try {
    const challenge = await readMfaChallenge(request)
    if (!challenge) return NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 })

    const { code } = await request.json()
    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
      select: { id: true, email: true, name: true, role: true, telegram: true, tokenVersion: true, twoFactorEnabled: true },
    })
    if (!user || user.tokenVersion !== challenge.tokenVersion) {
      return clearMfaCookie(NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 }))
    }

    const result = await verifyTwoFactorCode(user.id, "login", String(code ?? ""))
    if (result === "ok") {
      const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, telegram: user.telegram } })
      // This browser has now proved itself: skip the code here for 30 days.
      await setTrustedDeviceCookie(res, user)
      return clearMfaCookie(await setSessionCookie(res, user))
    }
    const messages = {
      invalid: "That code isn't right. Check the email and try again.",
      expired: "That code has expired. Request a new one.",
      locked: "Too many wrong attempts. Request a new code.",
    }
    return NextResponse.json({ error: messages[result], reason: result }, { status: 400 })
  } catch (error) {
    console.error("2FA verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
