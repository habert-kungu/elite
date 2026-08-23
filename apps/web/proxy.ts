import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

/**
 * Route guard (Next 16 "proxy", formerly middleware).
 *
 * - /app/**       → must be signed in
 * - /app/admin/** → must be signed in AND carry the admin role
 * - /login etc.   → signed-in users are bounced to their home
 *
 * The JWT is verified here directly (no network round-trip back to our own
 * API, which was fragile behind a reverse proxy). The role in the token is the
 * fast-path check; every admin API route re-checks the role against the DB.
 */

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

function secret(): Uint8Array | null {
  const s = process.env.JWT_SECRET
  if (s && s.length >= 16) return new TextEncoder().encode(s)
  if (process.env.NODE_ENV === "production") return null
  return new TextEncoder().encode("dev-only-insecure-secret-do-not-use-in-prod")
}

async function readSession(token: string | undefined): Promise<{ userId: string; role: string } | null> {
  if (!token) return null
  const key = secret()
  if (!key) return null
  try {
    const { payload } = await jwtVerify(token, key)
    if (typeof payload.userId !== "string") return null
    return { userId: payload.userId, role: typeof payload.role === "string" ? payload.role : "user" }
  } catch {
    return null
  }
}

function matches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/")
}

function clearTokenAndRedirect(request: NextRequest, to: string) {
  const res = NextResponse.redirect(new URL(to, request.url))
  res.cookies.set("token", "", { httpOnly: true, maxAge: 0, path: "/" })
  return res
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("token")?.value
  const session = await readSession(token)

  if (AUTH_ROUTES.some((r) => matches(pathname, r))) {
    if (session) {
      return NextResponse.redirect(new URL(session.role === "admin" ? "/app/admin" : "/app", request.url))
    }
    return NextResponse.next()
  }

  if (matches(pathname, "/app/admin")) {
    if (!session) return token ? clearTokenAndRedirect(request, "/login") : NextResponse.redirect(new URL("/login", request.url))
    if (session.role !== "admin") return NextResponse.redirect(new URL("/app", request.url))
    return NextResponse.next()
  }

  if (matches(pathname, "/app")) {
    if (!session) {
      const login = new URL("/login", request.url)
      if (pathname !== "/app") login.searchParams.set("next", pathname)
      return token ? clearTokenAndRedirect(request, login.toString()) : NextResponse.redirect(login)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  // Pages only — API routes do their own auth; static assets are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
