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
 * Sessions are sliding: the cookie dies after 8 hours of inactivity, and every
 * authenticated request mints a fresh one — so a client stays signed in across
 * a working day. No matter how active they are, a session is force-expired 7
 * days after sign-in and the password is asked for again.
 */
export const SESSION_IDLE_MAX_AGE = 8 * 60 * 60
export const SESSION_ABSOLUTE_MAX_AGE = 7 * 24 * 60 * 60

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

/**
 * A device the client has already proved out with an emailed code. While this
 * cookie is valid the code step is skipped, so two-step verification costs one
 * email per device per month rather than one per sign-in.
 *
 * It is bound to the user's `tokenVersion`, so a password change, a reset, or
 * an admin revoking sessions un-trusts every device at once.
 */
export const TRUSTED_DEVICE_COOKIE = "device"
export const TRUSTED_DEVICE_MAX_AGE = 30 * 24 * 60 * 60

export async function createTrustedDeviceToken(user: { id: string; tokenVersion: number }): Promise<string> {
  return new SignJWT({ sub: user.id, purpose: "device", tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TRUSTED_DEVICE_MAX_AGE}s`)
    .sign(getJwtSecret())
}

/** True when this browser already verified for this exact user and token version. */
export async function trustedDeviceMatches(
  token: string | undefined,
  user: { id: string; tokenVersion: number }
): Promise<boolean> {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload.purpose === "device" && payload.sub === user.id && payload.tv === user.tokenVersion
  } catch {
    return false
  }
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
