import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, createTwoFactorCode, verifyTwoFactorCode, twoFactorCooldown, verifyPassword, revokeAllSessions, setSessionCookie } from "@/lib/auth"
import { loginCodeEmail, twoFactorChangedEmail } from "@/lib/mail"
import prisma from "@/lib/db"

/** GET — current status. */
export async function GET(request: NextRequest) {
  const session = await getSessionUser(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { id: session.id }, select: { twoFactorEnabled: true } })
  return NextResponse.json({ enabled: !!u?.twoFactorEnabled, email: session.email })
}

/**
 * POST { action: "start" }            → emails a confirmation code
 * POST { action: "enable", code }     → turns two-step on
 * POST { action: "disable", password }→ turns it off (requires current password)
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
      const u = await prisma.user.findUnique({ where: { id: session.id }, select: { password: true } })
      if (!u?.password || !body.password || !(await verifyPassword(String(body.password), u.password))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      await prisma.user.update({ where: { id: session.id }, data: { twoFactorEnabled: false } })
      // Sign out other devices as a precaution; keep this one.
      const fresh = await revokeAllSessions(session.id)
      void twoFactorChangedEmail(session.email, false, session.name)
      return setSessionCookie(NextResponse.json({ success: true, enabled: false }), fresh)
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("2FA manage error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
