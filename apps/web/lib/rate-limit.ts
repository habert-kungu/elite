const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    const resetTime = now + WINDOW_MS
    rateLimitStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetTime }
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }
  
  record.count++
  return { 
    allowed: true, 
    remaining: MAX_ATTEMPTS - record.count, 
    resetTime: record.resetTime 
  }
}

export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key)
}

export function getRateLimitResetSeconds(resetTime: number): number {
  return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000))
}