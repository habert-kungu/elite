/**
 * Session token primitives shared by the Node routes and the edge middleware.
 *
 * Everything here is edge-safe (jose only — no prisma, no bcrypt), so the
 * middleware can slide a session forward without pulling in the whole auth
 * module.
 */
import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "token"

/**
 * Sessions are short and sliding: the cookie dies after 30 minutes of
 * inactivity, and every authenticated request mints a fresh one. No matter how
 * active the user is, a session is force-expired 8 hours after sign-in.
 */
export const SESSION_IDLE_MAX_AGE = 30 * 60
export const SESSION_ABSOLUTE_MAX_AGE = 8 * 60 * 60

// Resolve the signing secret lazily so a missing value fails closed in
// production (never silently falling back to a known, forgeable default).
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (secret && secret.length >= 16) {
    return new TextEncoder().encode(secret)
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set (or too short). Refusing to sign/verify tokens with an insecure default."
    )
  }
  // Development-only fallback. Clearly not for production use.
  return new TextEncoder().encode("dev-only-insecure-secret-do-not-use-in-prod")
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  name?: string
  /** User.tokenVersion at issue time; a mismatch means the session was revoked. */
  tv?: number
  /** Session start (unix seconds) — carried across refreshes to cap total life. */
  sat?: number
  [key: string]: unknown
}

export async function createToken(payload: JWTPayload, ttlSeconds: number = SESSION_IDLE_MAX_AGE): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as JWTPayload
  } catch {
    return null
  }
}

/** True once a session has outlived its absolute cap, however active it was. */
export function sessionExpired(payload: JWTPayload | null): boolean {
  // Tokens minted before sliding sessions existed carry no `sat`; they are
  // rejected outright so every pre-existing long-lived session is retired.
  if (!payload || typeof payload.sat !== "number") return true
  return Date.now() / 1000 - payload.sat > SESSION_ABSOLUTE_MAX_AGE
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  }
}
