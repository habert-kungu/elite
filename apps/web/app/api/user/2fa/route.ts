import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, createTwoFactorCode, verifyTwoFactorCode, twoFactorCooldown } from "@/lib/auth"
import { loginCodeEmail, twoFactorChangedEmail } from "@/lib/mail"
import prisma from "@/lib/db"

/** GET — current status. */
export async function GET(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // Two-step is required for every account; it is reported as always on.
  return NextResponse.json({ enabled: true, required: true, email: session.email })
}

/**
 * POST { action: "start" }        → emails a confirmation code
 * POST { action: "enable", code } → confirms two-step on this account
 *
 * There is no "disable": two-step verification is mandatory platform-wide.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await request.json()

    if (body.action === "start") {
      const wait = await twoFactorCooldown(session.id, "enable")
      if (wait > 0) return NextResponse.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 })
      const code = await createTwoFactorCode(session.id, "enable")
      const mail = await loginCodeEmail(session.email, code, { purpose: "enable", name: session.name })
      return NextResponse.json({ success: true, emailSent: mail.sent })
    }

    if (body.action === "enable") {
      const result = await verifyTwoFactorCode(session.id, "enable", String(body.code ?? ""))
      if (result !== "ok") {
        const messages = { invalid: "That code isn't right.", expired: "That code has expired — request a new one.", locked: "Too many wrong attempts — request a new code." }
        return NextResponse.json({ error: messages[result] }, { status: 400 })
      }
      await prisma.user.update({ where: { id: session.id }, data: { twoFactorEnabled: true } })
      void twoFactorChangedEmail(session.email, true, session.name)
      return NextResponse.json({ success: true, enabled: true })
    }

    if (body.action === "disable") {
      return NextResponse.json({ error: "Two-step verification is required and can't be turned off." }, { status: 403 })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("2FA manage error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
