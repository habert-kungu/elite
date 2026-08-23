import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/auth"

/** Kept for clients that probe admin status; the route guard lives in proxy.ts. */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ isAdmin: !!(await getAdminUser(request)) })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
