"use client"

import * as React from "react"

/**
 * Tiny stale-while-revalidate cache for client `fetch` calls.
 *
 * - First visit: shows loading, fetches, caches (memory + sessionStorage).
 * - Later visits / tab switches: renders the cached payload instantly (no
 *   skeleton flash), then silently refetches and patches in fresh data.
 * - `invalidate(prefix)` drops entries after a mutation so the next read is
 *   fresh; `clearCache()` wipes everything on sign-out.
 *
 * Entries expire after `ttl` ms (default 5 min) — past that they're still used
 * as the initial render but a refetch is always triggered.
 */

type Entry = { data: unknown; at: number }

const PREFIX = "ar:cache:"
const memory = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function readStorage(key: string): Entry | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Entry
    memory.set(key, parsed)
    return parsed
  } catch {
    return undefined
  }
}

function writeStorage(key: string, entry: Entry) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    /* quota / private mode — memory cache still works */
  }
}

function getEntry(key: string): Entry | undefined {
  return memory.get(key) ?? readStorage(key)
}

function setEntry(key: string, data: unknown) {
  const entry = { data, at: Date.now() }
  memory.set(key, entry)
  writeStorage(key, entry)
  listeners.get(key)?.forEach((fn) => fn())
}

/** Drop cached entries whose key starts with `prefix` (all if omitted). */
export function invalidateCache(prefix = "") {
  for (const key of Array.from(memory.keys())) {
    if (key.startsWith(prefix)) memory.delete(key)
  }
  if (typeof window !== "undefined") {
    try {
      for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
        const k = window.sessionStorage.key(i)
        if (k && k.startsWith(PREFIX + prefix)) window.sessionStorage.removeItem(k)
      }
    } catch {
      /* ignore */
    }
  }
  for (const [key, set] of listeners) {
    if (key.startsWith(prefix)) set.forEach((fn) => fn())
  }
}

export function clearCache() {
  invalidateCache("")
}

/** Fetch JSON with request de-duplication; resolves null on non-OK. */
export async function fetchCached<T>(key: string, url: string = key, init?: RequestInit): Promise<T | null> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T | null>
  const p = (async () => {
    try {
      const res = await fetch(url, init)
      if (!res.ok) return null
      const data = (await res.json()) as T
      setEntry(key, data)
      return data
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

export function useCachedFetch<T>(
  key: string | null,
  opts: { url?: string; ttl?: number; enabled?: boolean } = {}
) {
  const { url, ttl = 5 * 60 * 1000, enabled = true } = opts
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const entry = key ? getEntry(key) : undefined
  const data = (entry?.data as T | undefined) ?? null

  const refresh = React.useCallback(async () => {
    if (!key || !enabled) return null
    const hadData = !!getEntry(key)
    if (!hadData) setLoadingKey(key)
    setError(null)
    const result = await fetchCached<T>(key, url ?? key)
    if (result === null && !hadData) setError("Failed to load")
    setLoadingKey((k) => (k === key ? null : k))
    return result
  }, [key, url, enabled])

  // Subscribe to cache updates (other components / invalidate()).
  React.useEffect(() => {
    if (!key) return
    const set = listeners.get(key) ?? new Set()
    set.add(force)
    listeners.set(key, set)
    return () => {
      set.delete(force)
      if (set.size === 0) listeners.delete(key)
    }
  }, [key])

  // Initial load + revalidate when stale.
  React.useEffect(() => {
    if (!key || !enabled) return
    const current = getEntry(key)
    if (!current || Date.now() - current.at > ttl) {
      void refresh()
    }
  }, [key, enabled, ttl, refresh])

  const loading = !!key && enabled && !entry && loadingKey === key
  const initialLoading = !!key && enabled && !entry

  return { data, loading: loading || initialLoading, refreshing: !!entry && loadingKey === key, error, refresh, setData: (d: T) => key && setEntry(key, d) }
}
