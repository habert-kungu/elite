import { NextRequest, NextResponse } from "next/server"
import { createUser, setSessionCookie } from "@/lib/auth"
import prisma from "@/lib/db"
import { welcomeEmail } from "@/lib/mail"

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

    const user = await createUser(email, password, name, telegram)
    void welcomeEmail(user.email, user.name)

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        telegram: user.telegram,
      },
    })

    return setSessionCookie(response, user)
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}