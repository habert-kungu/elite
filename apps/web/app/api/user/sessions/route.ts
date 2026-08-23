import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, revokeAllSessions, setSessionCookie } from "@/lib/auth"

/** POST: sign out every other device; this browser gets a fresh session cookie. */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const fresh = await revokeAllSessions(session.id)
    return setSessionCookie(NextResponse.json({ success: true }), fresh)
  } catch (error) {
    console.error("Revoke sessions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
