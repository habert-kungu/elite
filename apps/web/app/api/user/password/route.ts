import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hashPassword, verifyPassword, isStrongEnoughPassword, revokeAllSessions, setSessionCookie } from "@/lib/auth"
import { passwordChangedEmail } from "@/lib/mail"
import prisma from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 })
    }
    if (!isStrongEnoughPassword(newPassword)) {
      return NextResponse.json({ error: "New password must be 6–128 characters" }, { status: 400 })
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must differ from the current one" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { password: true } })
    if (!user?.password || !(await verifyPassword(currentPassword, user.password))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    await prisma.user.update({ where: { id: session.id }, data: { password: await hashPassword(newPassword) } })
    // Sign out every other device; re-issue a fresh cookie for this one.
    const fresh = await revokeAllSessions(session.id)
    void passwordChangedEmail(session.email, session.name)

    return setSessionCookie(NextResponse.json({ success: true, otherSessionsRevoked: true }), fresh)
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
