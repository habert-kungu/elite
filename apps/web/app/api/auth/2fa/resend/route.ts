import { NextRequest, NextResponse } from "next/server"
import { readMfaChallenge, createTwoFactorCode, twoFactorCooldown, maskEmail } from "@/lib/auth"
import { loginCodeEmail } from "@/lib/mail"
import prisma from "@/lib/db"

/** POST — emails a fresh sign-in code for the pending challenge (30s cooldown). */
export async function POST(request: NextRequest) {
  try {
    const challenge = await readMfaChallenge(request)
    if (!challenge) return NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: challenge.userId }, select: { id: true, email: true, name: true, tokenVersion: true } })
    if (!user || user.tokenVersion !== challenge.tokenVersion) return NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 })

    const wait = await twoFactorCooldown(user.id, "login")
    if (wait > 0) return NextResponse.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 })

    const code = await createTwoFactorCode(user.id, "login")
    const mail = await loginCodeEmail(user.email, code, { purpose: "login", name: user.name })
    return NextResponse.json({ success: true, email: maskEmail(user.email), emailSent: mail.sent })
  } catch (error) {
    console.error("2FA resend error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
