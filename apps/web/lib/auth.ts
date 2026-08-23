import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import prisma from "./db"

// Resolve the signing secret lazily so a missing value fails closed in
// production (never silently falling back to a known, forgeable default).
function getJwtSecret(): Uint8Array {
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
  [key: string]: unknown
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
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

export async function createUser(
  email: string,
  password: string,
  name?: string,
  telegram?: string
) {
  const passwordHash = await hashPassword(password)
  return prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name?.trim(),
      telegram: telegram?.trim(),
      password: passwordHash,
      role: "user",
    },
  })
}

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user || !user.password) return null

  const valid = await verifyPassword(password, user.password)
  if (!valid) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    telegram: user.telegram,
    tokenVersion: user.tokenVersion,
    twoFactorEnabled: user.twoFactorEnabled,
  }
}
// ---------------------------------------------------------------------------
// Request-scoped session helpers for API routes
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: string
  telegram: string | null
  tokenVersion: number
}

export const SESSION_COOKIE = "token"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/** Builds the JWT claims for a user, stamping the current tokenVersion. */
export function sessionClaims(user: { id: string; email: string; role: string; name?: string | null; tokenVersion: number }): JWTPayload {
  return { userId: user.id, email: user.email, role: user.role, name: user.name || undefined, tv: user.tokenVersion }
}

/** Issues a session cookie on the given response. */
export async function setSessionCookie(
  response: NextResponse,
  user: { id: string; email: string; role: string; name?: string | null; tokenVersion: number }
) {
  response.cookies.set(SESSION_COOKIE, await createToken(sessionClaims(user)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
  return response
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}

/**
 * Resolves the signed-in user from the request cookie and re-reads them from
 * the database, so a role change, a deleted account, or a session revocation
 * (tokenVersion bump) takes effect immediately rather than whenever the 7-day
 * JWT happens to expire.
 */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload?.userId) return null
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, telegram: true, tokenVersion: true },
  })
  if (!user) return null
  // Tokens minted before this field existed carry no `tv`; treat as version 0.
  if ((payload.tv ?? 0) !== user.tokenVersion) return null
  return user
}

/**
 * Invalidates every session for a user by bumping tokenVersion. Returns the
 * updated user so the caller can re-issue a cookie for the current device.
 */
export async function revokeAllSessions(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { id: true, email: true, name: true, role: true, telegram: true, tokenVersion: true },
  })
}

export async function getAdminUser(request: NextRequest): Promise<SessionUser | null> {
  const user = await getSessionUser(request)
  return user?.role === "admin" ? user : null
}

export function isStrongEnoughPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 6 && password.length <= 128
}

// ---------------------------------------------------------------------------
// Password reset tokens (hashed at rest, single-use, 1h expiry)
// ---------------------------------------------------------------------------

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function createPasswordResetToken(userId: string, ttlMs: number = RESET_TOKEN_TTL_MS): Promise<string> {
  const token = randomBytes(32).toString("base64url")
  // Invalidate any outstanding tokens so only the newest link works.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  })
  return token
}

/** Returns the owning user id if the token is valid, unused and unexpired. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  if (typeof token !== "string" || token.length < 20) return null
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } })
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return null
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })
  return record.userId
}

export function generateTempPassword(): string {
  // 12 chars from an unambiguous alphabet (no 0/O/1/l).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(12)
  let out = ""
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i]! % alphabet.length]
  return out
}

// ---------------------------------------------------------------------------
// Email two-step verification (6-digit codes, hashed at rest)
// ---------------------------------------------------------------------------

export const TWO_FACTOR_CODE_TTL_MS = 10 * 60 * 1000
export const TWO_FACTOR_MAX_ATTEMPTS = 5
export const MFA_COOKIE = "mfa"

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex")
}

/** Creates a fresh code for the user (invalidating older ones of the same purpose). Returns the plain code for emailing. */
export async function createTwoFactorCode(userId: string, purpose: "login" | "enable"): Promise<string> {
  const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0")
  await prisma.twoFactorCode.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } })
  await prisma.twoFactorCode.create({
    data: { userId, purpose, codeHash: hashCode(userId, code), expiresAt: new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS) },
  })
  return code
}

/** Seconds until another code may be issued (30s cooldown), or 0. */
export async function twoFactorCooldown(userId: string, purpose: "login" | "enable"): Promise<number> {
  const last = await prisma.twoFactorCode.findFirst({ where: { userId, purpose }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
  if (!last) return 0
  return Math.max(0, Math.ceil((last.createdAt.getTime() + 30_000 - Date.now()) / 1000))
}

export type TwoFactorCheck = "ok" | "invalid" | "expired" | "locked"

/** Verifies a code; consumes it on success, counts attempts on failure. */
export async function verifyTwoFactorCode(userId: string, purpose: "login" | "enable", code: string): Promise<TwoFactorCheck> {
  const cleaned = String(code || "").replace(/\D/g, "")
  const record = await prisma.twoFactorCode.findFirst({ where: { userId, purpose, usedAt: null }, orderBy: { createdAt: "desc" } })
  if (!record) return "expired"
  if (record.expiresAt.getTime() < Date.now()) return "expired"
  if (record.attempts >= TWO_FACTOR_MAX_ATTEMPTS) return "locked"
  if (cleaned.length === 6 && record.codeHash === hashCode(userId, cleaned)) {
    await prisma.twoFactorCode.update({ where: { id: record.id }, data: { usedAt: new Date() } })
    return "ok"
  }
  const updated = await prisma.twoFactorCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
  return updated.attempts >= TWO_FACTOR_MAX_ATTEMPTS ? "locked" : "invalid"
}

/** Short-lived, signed "password accepted, code pending" challenge kept in an httpOnly cookie. */
export async function createMfaChallenge(user: { id: string; tokenVersion: number }): Promise<string> {
  return new SignJWT({ sub: user.id, purpose: "2fa", tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtSecret())
}

export async function readMfaChallenge(request: NextRequest): Promise<{ userId: string; tokenVersion: number } | null> {
  const token = request.cookies.get(MFA_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.purpose !== "2fa" || typeof payload.sub !== "string") return null
    return { userId: payload.sub, tokenVersion: typeof payload.tv === "number" ? payload.tv : 0 }
  } catch {
    return null
  }
}

export function setMfaCookie(response: NextResponse, token: string) {
  response.cookies.set(MFA_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" })
  return response
}

export function clearMfaCookie(response: NextResponse) {
  response.cookies.set(MFA_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" })
  return response
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!user || !domain) return email
  const shown = user.length <= 2 ? user[0] ?? "" : user.slice(0, 2)
  return `${shown}${"•".repeat(Math.max(2, Math.min(6, user.length - shown.length)))}@${domain}`
}
