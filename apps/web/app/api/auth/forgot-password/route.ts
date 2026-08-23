import { NextRequest, NextResponse } from "next/server"
import { createPasswordResetToken } from "@/lib/auth"
import { passwordResetEmail } from "@/lib/mail"
import { checkRateLimit, getRateLimitResetSeconds } from "@/lib/rate-limit"
import prisma from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const limit = checkRateLimit(`forgot:${email}`)
    if (!limit.allowed) {
      const wait = getRateLimitResetSeconds(limit.resetTime)
      return NextResponse.json({ error: `Too many requests. Try again in ${Math.ceil(wait / 60)} minutes.` }, { status: 429 })
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
    // Always respond the same way so the endpoint can't be used to enumerate accounts.
    if (user) {
      const token = await createPasswordResetToken(user.id)
      await passwordResetEmail(user.email, token, user.name)
    }

    return NextResponse.json({ success: true, message: "If an account exists for that email, a reset link is on its way." })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
