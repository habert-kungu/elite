import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  SESSION_COOKIE,
  SESSION_IDLE_MAX_AGE,
  createToken,
  sessionCookieOptions,
  sessionExpired,
  verifyToken,
} from "@/lib/session-token"
import { blockIp, blockedFor, clientIp, looksAutomated, rateLimit, sameOrigin } from "@/lib/guard"

/**
 * Edge guard (Next 16 "proxy", formerly middleware). It does three jobs:
 *
 * 1. Abuse protection — per-IP rate limits, escalating blocks, same-origin and
 *    bot checks on the API surface.
 * 2. Sessions — verifies the JWT, enforces the absolute session cap, and
 *    slides the 30-minute idle window forward on every request.
 * 3. Routing — /app/** needs a session, /app/admin/** needs the admin role,
 *    and signed-in users are bounced off the auth pages.
 *
 * The role in the token is only the fast path; every admin API route re-checks
 * it against the database.
 */

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"]

/** Endpoints where a wrong guess is worth something to an attacker. */
const CREDENTIAL_ROUTES = ["/api/auth/signin", "/api/auth/signup", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/2fa"]

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

function matches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/")
}

function tooMany(retryAfter: number, message: string, isApi: boolean) {
  const headers = { "Retry-After": String(retryAfter) }
  return isApi
    ? NextResponse.json({ error: message }, { status: 429, headers })
    : new NextResponse(message, { status: 429, headers })
}

/** Applies the IP-based protections. Returns a response only when refusing. */
function guard(request: NextRequest, pathname: string, isApi: boolean): NextResponse | null {
  const ip = clientIp(request)

  const blocked = blockedFor(ip)
  if (blocked > 0) {
    return tooMany(blocked, "Too many requests from this address. Try again later.", isApi)
  }

  if (!isApi) return null

  if (MUTATING.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (CREDENTIAL_ROUTES.some((p) => matches(pathname, p)) && MUTATING.has(request.method)) {
    if (looksAutomated(request.headers.get("user-agent"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    // 10 credential attempts a minute, then a block that grows on repeats.
    const credit = rateLimit(`cred:${ip}`, 10, 60_000)
    if (!credit.allowed) {
      return tooMany(blockIp(ip), "Too many attempts. This address is temporarily blocked.", true)
    }
  }

  // General ceiling so a script can't hammer the app behind a valid session.
  const general = rateLimit(`api:${ip}`, 240, 60_000)
  if (!general.allowed) {
    return tooMany(general.retryAfter, "Slow down — too many requests.", true)
  }

  return null
}

/** Slides the idle window forward; `sat` rides along so the hard cap holds. */
async function withRefreshedSession(response: NextResponse, payload: Awaited<ReturnType<typeof verifyToken>>) {
  if (payload) {
    response.cookies.set(SESSION_COOKIE, await createToken(payload), sessionCookieOptions(SESSION_IDLE_MAX_AGE))
  }
  return response
}

function signOutRedirect(request: NextRequest, to: string) {
  const res = NextResponse.redirect(new URL(to, request.url))
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0))
  return res
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api/")

  const refused = guard(request, pathname, isApi)
  if (refused) return refused

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? await verifyToken(token) : null
  // A session past its absolute cap — or minted before sliding sessions
  // existed — is treated as no session at all.
  const session = payload && !sessionExpired(payload) && typeof payload.userId === "string" ? payload : null

  if (isApi) {
    const response = NextResponse.next()
    if (session) return withRefreshedSession(response, session)
    if (token) response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0))
    return response
  }

  if (AUTH_ROUTES.some((r) => matches(pathname, r))) {
    if (session) {
      return withRefreshedSession(
        NextResponse.redirect(new URL(session.role === "admin" ? "/app/admin" : "/app", request.url)),
        session
      )
    }
    return NextResponse.next()
  }

  if (matches(pathname, "/app/admin")) {
    if (!session) return signOutRedirect(request, expiredLogin(request, pathname, token))
    if (session.role !== "admin") return withRefreshedSession(NextResponse.redirect(new URL("/app", request.url)), session)
    return withRefreshedSession(NextResponse.next(), session)
  }

  if (matches(pathname, "/app")) {
    if (!session) return signOutRedirect(request, expiredLogin(request, pathname, token))
    return withRefreshedSession(NextResponse.next(), session)
  }

  return session ? withRefreshedSession(NextResponse.next(), session) : NextResponse.next()
}

/** Where to send someone who lost (or never had) a session. */
function expiredLogin(request: NextRequest, pathname: string, token: string | undefined) {
  const login = new URL("/login", request.url)
  if (pathname !== "/app") login.searchParams.set("next", pathname)
  // A cookie that was present but no longer valid means the session ran out.
  if (token) login.searchParams.set("expired", "1")
  return login.toString()
}

export const config = {
  // Pages and API routes; static assets are skipped.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
