import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, clearSessionCookie } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      // Expired, revoked (tokenVersion bump) or orphaned — drop the cookie.
      const res = NextResponse.json({ user: null }, { status: 401 })
      return request.cookies.get("token") ? clearSessionCookie(res) : res
    }
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, telegram: user.telegram } })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
