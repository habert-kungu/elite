import { NextRequest, NextResponse } from "next/server"
import { consumePasswordResetToken, hashPassword, isStrongEnoughPassword, clearSessionCookie } from "@/lib/auth"
import { passwordChangedEmail } from "@/lib/mail"
import prisma from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 })
    }
    if (!isStrongEnoughPassword(password)) {
      return NextResponse.json({ error: "Password must be 6–128 characters" }, { status: 400 })
    }

    const userId = await consumePasswordResetToken(token)
    if (!userId) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      // tokenVersion bump signs the account out everywhere.
      data: { password: await hashPassword(password), tokenVersion: { increment: 1 } },
      select: { email: true, name: true },
    })
    void passwordChangedEmail(user.email, user.name)

    // Clear any session cookie on this browser so the user signs in fresh.
    return clearSessionCookie(NextResponse.json({ success: true }))
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
