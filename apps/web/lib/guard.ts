/**
 * Edge-safe abuse protection: per-IP rate limiting, escalating temporary IP
 * blocks, and crude bot detection. State lives in memory, so limits are per
 * server instance — enough for a single-container deployment, and it fails
 * open rather than locking anyone out if the process restarts.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()
/** ip → unix ms when the block lifts. */
const blocks = new Map<string, number>()
/** ip → how many times it has been blocked (drives escalating durations). */
const strikes = new Map<string, number>()

/** Keeps the maps from growing without bound on a long-running process. */
function sweep(now: number) {
  if (windows.size < 5000) return
  for (const [key, w] of windows) if (w.resetAt < now) windows.delete(key)
  for (const [ip, until] of blocks) if (until < now) blocks.delete(ip)
}

export function clientIp(request: Request): string {
  const headers = request.headers
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown"
}

/**
 * Fixed-window counter. Returns how long to wait when the caller is over the
 * limit; `retryAfter` is 0 while the request is allowed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  sweep(now)
  const current = windows.get(key)
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }
  current.count++
  if (current.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

/** Seconds left on an active block, or 0 when the IP is free to proceed. */
export function blockedFor(ip: string): number {
  const until = blocks.get(ip)
  if (!until) return 0
  const left = Math.ceil((until - Date.now()) / 1000)
  if (left <= 0) {
    blocks.delete(ip)
    return 0
  }
  return left
}

/**
 * Blocks an IP outright. Repeat offenders are held longer: 5 minutes, then 30,
 * then 2 hours, then 12.
 */
export function blockIp(ip: string): number {
  const strike = (strikes.get(ip) ?? 0) + 1
  strikes.set(ip, strike)
  const minutes = [5, 30, 120, 720][Math.min(strike, 4) - 1]!
  const ms = minutes * 60 * 1000
  blocks.set(ip, Date.now() + ms)
  return ms / 1000
}

const BOT_UA = /(bot|crawler|spider|scrapy|curl|wget|python-requests|httpclient|libwww|okhttp|go-http-client|java\/|axios\/|node-fetch|postman|insomnia|nikto|sqlmap|nmap|masscan|zgrab)/i

/** Credential endpoints are for humans in browsers; scripted agents are refused. */
export function looksAutomated(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim().length < 10) return true
  return BOT_UA.test(userAgent)
}

/**
 * State-changing requests must come from our own origin. Blocks cross-site
 * form posts and the simplest scripted abuse, which rarely sets Origin.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const host = request.headers.get("host")
  if (!host) return false
  const matches = (value: string | null) => {
    if (!value) return false
    try {
      return new URL(value).host === host
    } catch {
      return false
    }
  }
  if (origin) return matches(origin)
  // Some browsers omit Origin on same-origin navigations; fall back to Referer.
  if (referer) return matches(referer)
  return false
}
