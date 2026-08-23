"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/app/providers/auth-provider"
import { NotificationProvider } from "@/app/providers/notification-provider"
import { NotificationBell, ToastNotification } from "@/app/components/notification-bell"
import { ThemeToggle } from "@/app/components/theme-toggle"
import { clearCache } from "@/lib/use-cached-fetch"

type NavItem = { href: string; label: string; icon: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/app", label: "Overview", icon: "home" },
      { href: "/app/transactions", label: "Transactions", icon: "history" },
    ],
  },
  {
    label: "Actions",
    items: [
      { href: "/app/investments", label: "Buy Crypto", icon: "wallet" },
      { href: "/app/withdraw", label: "Withdraw", icon: "send" },
      { href: "/app/services", label: "Services", icon: "shopping" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/app/strategies", label: "Strategies", icon: "trending" },
      { href: "/app/risk", label: "Risk Management", icon: "shield" },
      { href: "/app/explore", label: "Explore Markets", icon: "globe" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/profile", label: "Profile", icon: "user" },
      { href: "/app/support", label: "Support", icon: "help" },
    ],
  },
]

function Icon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    home: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    history: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    wallet: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    send: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    shopping: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    trending: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    shield: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    globe: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    user: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    help: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    logout: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    menu: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    settings: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
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
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      }`}
    >
      <span
        className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <Icon name={item.icon} className="h-4 w-4 flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

/** App-style bottom tab bar for mobile (hidden on desktop). */
function MobileTabBar({ pathname, onMenu }: { pathname: string; onMenu: () => void }) {
  const tabs = [
    { href: "/app", label: "Home", icon: "home" },
    { href: "/app/investments", label: "Buy", icon: "wallet" },
    { href: "/app/withdraw", label: "Withdraw", icon: "send" },
    { href: "/app/explore", label: "Markets", icon: "globe" },
  ]
  return (
    <nav className="z-40 flex flex-shrink-0 items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tabs.map((t) => {
        const active = t.href === "/app" ? pathname === "/app" : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon name={t.icon} className="h-5 w-5 flex-shrink-0" />
            <span className="w-full truncate text-center text-[10px] font-medium leading-none tracking-tight">{t.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onMenu}
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-muted-foreground"
        aria-label="More"
      >
        <Icon name="menu" className="h-5 w-5 flex-shrink-0" />
        <span className="w-full truncate text-center text-[10px] font-medium leading-none tracking-tight">More</span>
      </button>
    </nav>
  )
}

/** User ⇄ Admin switcher, shown only to admins. */
function AppSwitcher({ current }: { current: "user" | "admin" }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-secondary/60 p-0.5 text-[12px] font-medium">
      <Link
        href="/app"
        className={`rounded-md px-2.5 py-1 transition-colors ${current === "user" ? "bg-card text-foreground elevation-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        User
      </Link>
      <Link
        href="/app/admin"
        className={`rounded-md px-2.5 py-1 transition-colors ${current === "admin" ? "bg-card text-foreground elevation-sm" : "text-muted-foreground hover:text-foreground"}`}
      >
        Admin
      </Link>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // proxy.ts only checks the JWT signature; if the server says the session is
  // gone (revoked, expired, deleted) send the user back to sign in.
  React.useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, pathname, router])

  const isAdmin = user?.role === "admin"
  const allItems = NAV_GROUPS.flatMap((g) => g.items)
  const currentPage = allItems.find((i) => i.href === pathname)

  const closeMobile = () => setMobileOpen(false)

  return (
    <NotificationProvider userId={user?.id} isAdmin={isAdmin}>
      <div className="flex h-dvh min-h-0 bg-background">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 z-50 flex h-dvh w-60 flex-col border-r border-border bg-sidebar transition-transform lg:static lg:h-auto lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand */}
          <div className="flex h-16 flex-shrink-0 items-center gap-2 px-5 text-foreground">
            <Link href="/" className="flex items-center gap-2">
              <svg className="h-7 w-7" viewBox="0 0 44 45" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M18.4201 9.7905C19.2053 10.2438 19.4743 11.2477 19.021 12.0329L10.8134 26.2488C10.3601 27.034 9.35616 27.3029 8.57104 26.8497C7.78592 26.3964 7.51689 25.3924 7.9702 24.6073L16.1778 10.3913C16.6311 9.60622 17.635 9.33722 18.4201 9.7905ZM27.7561 13.3169C28.5412 13.7702 28.8102 14.7741 28.3569 15.5592L18.5078 32.6184C18.0545 33.4035 17.0506 33.6725 16.2655 33.2192C15.4803 32.7659 15.2113 31.762 15.6646 30.9769L25.5137 13.9177C25.967 13.1326 26.9709 12.8636 27.7561 13.3169ZM36.7357 20.7424C37.2646 19.8265 37.0569 18.7165 36.2717 18.2632C35.4866 17.8099 34.4214 18.185 33.8926 19.1009L24.317 35.6862C23.7882 36.6022 23.9959 37.7122 24.7811 38.1655C25.5662 38.6188 26.6314 38.2437 27.1602 37.3277L36.7357 20.7424Z" fill="currentColor"/>
              </svg>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">AlphaReserve</span>
            </Link>
          </div>

          {/* Nav (scrollable) */}
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={closeMobile} />
                ))}
              </div>
            ))}
            {isAdmin && (
              <div className="space-y-0.5">
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Admin</div>
                <NavLink item={{ href: "/app/admin", label: "Admin Panel", icon: "settings" }} active={pathname.startsWith("/app/admin")} onNavigate={closeMobile} />
              </div>
            )}
          </nav>

          {/* Footer: user + sign out */}
          <div className="flex-shrink-0 space-y-2 border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{user?.name || user?.email || "User"}</p>
                <p className="text-[11px] text-muted-foreground">{isAdmin ? "Admin" : "Investor"}</p>
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

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} aria-hidden="true" />
        )}

        {/* Main content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="-ml-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary lg:hidden"
                aria-label="Open menu"
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <div className="truncate text-base font-semibold text-foreground">{currentPage?.label || "Dashboard"}</div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && <AppSwitcher current="user" />}
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>
          </div>
          <ToastNotification />
          {/* App-style bottom nav (mobile only) — a footer of the shell, not a fixed overlay */}
          <MobileTabBar pathname={pathname} onMenu={() => setMobileOpen(true)} />
        </div>

      </div>
    </NotificationProvider>
  )
}
