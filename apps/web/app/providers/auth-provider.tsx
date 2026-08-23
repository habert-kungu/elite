"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { clearCache } from "@/lib/use-cached-fetch"

interface User {
  id: string
  email: string
  name: string | null
  role: string
  telegram: string | null
}

export interface SignInResult {
  requiresTwoFactor?: boolean
  /** Masked address the code was sent to, e.g. "ha••••@gmail.com". */
  email?: string
  emailSent?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  /** Resolves with `requiresTwoFactor: true` when a code step is needed; otherwise redirects. */
  signIn: (email: string, password: string) => Promise<SignInResult>
  verifyTwoFactor: (code: string) => Promise<void>
  resendTwoFactor: () => Promise<SignInResult>
  signUp: (data: { name: string; email: string; password: string; telegram?: string }) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (user: User | null) => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const SNAPSHOT_KEY = "ar:user"

function readSnapshot(): User | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function writeSnapshot(user: User | null) {
  if (typeof window === "undefined") return
  try {
    if (user) window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(user))
    else window.sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    /* ignore */
  }
}

/** Where a user lands after signing in: an explicit ?next= (same-origin path only) or their home. */
function landingFor(user: User): string {
  if (typeof window !== "undefined") {
    const next = new URLSearchParams(window.location.search).get("next")
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      if (!next.startsWith("/app/admin") || user.role === "admin") return next
    }
  }
  return user.role === "admin" ? "/app/admin" : "/app"
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Hydrate from the session snapshot so layouts render the signed-in user
  // instantly; /api/auth/me then confirms (or clears) it in the background.
  const [user, setUserState] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  const setUser = React.useCallback((u: User | null) => {
    setUserState(u)
    writeSnapshot(u)
  }, [])

  const refreshUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else if (res.status === 401) {
        setUser(null)
      }
    } catch {
      /* keep whatever we have; network blips shouldn't log the user out */
    } finally {
      setLoading(false)
    }
  }, [setUser])

  React.useEffect(() => {
    const snap = readSnapshot()
    if (snap) {
      setUserState(snap)
      setLoading(false)
    }
    void refreshUser()
  }, [refreshUser])

  const finishSignIn = (u: User) => {
    clearCache()
    setUser(u)
    router.push(landingFor(u))
  }

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Login failed")
    if (data.requiresTwoFactor) return { requiresTwoFactor: true, email: data.email, emailSent: data.emailSent }
    finishSignIn(data.user)
    return {}
  }

  const verifyTwoFactor = async (code: string) => {
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Verification failed")
    finishSignIn(data.user)
  }

  const resendTwoFactor = async (): Promise<SignInResult> => {
    const res = await fetch("/api/auth/2fa/resend", { method: "POST" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Couldn't resend the code")
    return { requiresTwoFactor: true, email: data.email, emailSent: data.emailSent }
  }

  const signUp = async (payload: { name: string; email: string; password: string; telegram?: string }) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Registration failed")
    clearCache()
    setUser(data.user)
    router.push("/app")
  }

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } finally {
      clearCache()
      setUser(null)
      router.push("/login")
    }
  }

  return <AuthContext.Provider value={{ user, loading, signIn, verifyTwoFactor, resendTwoFactor, signUp, signOut, refreshUser, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
