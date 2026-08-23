"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/app/components/theme-toggle"
import { useAuth } from "@/app/providers/auth-provider"
import { NotificationProvider } from "@/app/providers/notification-provider"
import { NotificationBell, ToastNotification } from "@/app/components/notification-bell"
import { clearCache } from "@/lib/use-cached-fetch"

type NavItem = { href: string; label: string; icon: string }

const navItems: NavItem[] = [
  { href: "/app/admin", label: "Dashboard", icon: "home" },
  { href: "/app/admin/deposits", label: "Deposits", icon: "deposit" },
  { href: "/app/admin/investments", label: "Investments", icon: "investment" },
  { href: "/app/admin/transactions", label: "Transactions", icon: "transaction" },
  { href: "/app/admin/users", label: "Users", icon: "user" },
  { href: "/app/admin/communications", label: "Communications", icon: "mail" },
]

function Icon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
    deposit: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    investment: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    transaction: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
    user: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    logout: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    mail: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>,
    menu: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  }
  return <span className="inline-flex">{icons[name]}</span>
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
        active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      }`}
    >
      <span className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
      <Icon name={item.icon} className="h-4 w-4 flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

function AppSwitcher({ current }: { current: "user" | "admin" }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-secondary/60 p-0.5 text-[12px] font-medium">
      <Link href="/app" className={`rounded-md px-2.5 py-1 transition-colors ${current === "user" ? "bg-card text-foreground elevation-sm" : "text-muted-foreground hover:text-foreground"}`}>User</Link>
      <Link href="/app/admin" className={`rounded-md px-2.5 py-1 transition-colors ${current === "admin" ? "bg-card text-foreground elevation-sm" : "text-muted-foreground hover:text-foreground"}`}>Admin</Link>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Second line of defence behind proxy.ts: if the session resolves to a
  // non-admin (e.g. role was revoked), leave the admin area immediately.
  const isAdmin = user?.role === "admin"
  React.useEffect(() => {
    if (!loading && user && !isAdmin) router.replace("/app")
    if (!loading && !user) router.replace("/login")
  }, [loading, user, isAdmin, router])

  const isActive = (href: string) => pathname === href || (href !== "/app/admin" && pathname.startsWith(href))
  const currentPage = navItems.find((i) => isActive(i.href))
  const closeMobile = () => setMobileOpen(false)

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <NotificationProvider userId={user?.id} isAdmin>
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-sidebar transition-transform lg:sticky lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-2 px-5 text-foreground">
          <Link href="/app/admin" className="flex items-center gap-2">
            <svg className="h-7 w-7" viewBox="0 0 44 45" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M18.4201 9.7905C19.2053 10.2438 19.4743 11.2477 19.021 12.0329L10.8134 26.2488C10.3601 27.034 9.35616 27.3029 8.57104 26.8497C7.78592 26.3964 7.51689 25.3924 7.9702 24.6073L16.1778 10.3913C16.6311 9.60622 17.635 9.33722 18.4201 9.7905ZM27.7561 13.3169C28.5412 13.7702 28.8102 14.7741 28.3569 15.5592L18.5078 32.6184C18.0545 33.4035 17.0506 33.6725 16.2655 33.2192C15.4803 32.7659 15.2113 31.762 15.6646 30.9769L25.5137 13.9177C25.967 13.1326 26.9709 12.8636 27.7561 13.3169ZM36.7357 20.7424C37.2646 19.8265 37.0569 18.7165 36.2717 18.2632C35.4866 17.8099 34.4214 18.185 33.8926 19.1009L24.317 35.6862C23.7882 36.6022 23.9959 37.7122 24.7811 38.1655C25.5662 38.6188 26.6314 38.2437 27.1602 37.3277L36.7357 20.7424Z" fill="currentColor"/>
            </svg>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">AlphaReserve</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Admin</div>
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={closeMobile} />
          ))}
        </nav>

        <div className="flex-shrink-0 space-y-2 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{user?.name || user?.email}</p>
              <p className="text-[11px] text-muted-foreground">Administrator</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/signout", { method: "POST" })
              } finally {
                clearCache()
                window.location.href = "/login"
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} aria-hidden="true" />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="-ml-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden" aria-label="Open menu">
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="truncate text-base font-semibold text-foreground">{currentPage?.label || "Admin"}</div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 rounded-full bg-[var(--bg-success)] px-2.5 py-1 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
              <span className="text-[10px] font-semibold text-[var(--color-success)]">Live</span>
            </div>
            <AppSwitcher current="admin" />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>
        <ToastNotification />
      </div>
    </div>
    </NotificationProvider>
  )
}
