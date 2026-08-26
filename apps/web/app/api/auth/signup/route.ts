import { NextRequest, NextResponse } from "next/server"
import { createUser, createTwoFactorCode, createMfaChallenge, setMfaCookie, maskEmail } from "@/lib/auth"
import prisma from "@/lib/db"
import { welcomeEmail, loginCodeEmail } from "@/lib/mail"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, telegram } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      )
    }

    // Reject the classic bot giveaway: a hidden field only a script fills in.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ error: "Registration failed" }, { status: 400 })
    }

    const user = await createUser(email, password, name, telegram)
    void welcomeEmail(user.email, user.name)

    // No session yet — the account is unusable until the emailed code is
    // verified, so nobody can sign up and start acting on an unowned inbox.
    const code = await createTwoFactorCode(user.id, "login")
    const mail = await loginCodeEmail(user.email, code, { purpose: "login", name: user.name })
    const challenge = await createMfaChallenge(user)
    const response = NextResponse.json({
      requiresTwoFactor: true,
      email: maskEmail(user.email),
      emailSent: mail.sent,
    })
    return setMfaCookie(response, challenge)
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}