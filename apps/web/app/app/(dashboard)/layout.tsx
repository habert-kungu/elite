"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/app/providers/auth-provider"
import { NotificationProvider } from "@/app/providers/notification-provider"
import { NotificationBell, ToastNotification } from "@/app/components/notification-bell"
import { ThemeToggle } from "@/app/components/theme-toggle"
import { clearCache, useCachedFetch } from "@/lib/use-cached-fetch"
import { BrandLockup } from "@/app/components/brand-logo"
import { cn } from "@workspace/ui/lib/utils"
import {
  IconAdjustments,
  IconArrowUpRight,
  IconBriefcase2,
  IconChartCandle,
  IconCoins,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconMessages,
  IconReceipt2,
  IconUserCircle,
  IconWorldSearch,
  IconX,
} from "@tabler/icons-react"

/* -------------------------------------------------------------------------
   App shell: a standard left sidebar (persistent from lg, a drawer below)
   built on the Deriv "Menu item" spec — 48px rows, 16px padding, a 4px
   brand indicator on the current item — plus a slim header for balance,
   deposit, theme and notifications. Content sits on the primary background
   with cards on the secondary one.
------------------------------------------------------------------------- */

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string; stroke?: number }> }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Trade",
    items: [
      { href: "/app", label: "Overview", icon: IconLayoutDashboard },
      { href: "/app/investments", label: "Trade", icon: IconCoins },
      { href: "/app/explore", label: "Markets", icon: IconWorldSearch },
      { href: "/app/transactions", label: "Reports", icon: IconReceipt2 },
    ],
  },
  {
    label: "Cashier",
    items: [
      { href: "/app/withdraw", label: "Withdraw", icon: IconArrowUpRight },
      { href: "/app/services", label: "Services", icon: IconBriefcase2 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/app/profile", label: "Account", icon: IconUserCircle },
      { href: "/app/strategies", label: "Research", icon: IconChartCandle },
      { href: "/app/support", label: "Help centre", icon: IconMessages },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href)
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Sidebar row (Deriv menu item: 48px, 16px padding, 4px indicator). */
function SidebarLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Glyph = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center gap-3 px-4 text-[14px] transition-colors",
        active ? "bg-hover font-bold text-foreground" : "text-general hover:bg-hover"
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-[var(--brand-accent)]" />}
      <Glyph className={cn("h-5 w-5 flex-shrink-0", active ? "text-foreground" : "text-less")} stroke={1.7} />
      <span>{item.label}</span>
    </Link>
  )
}

/** Bottom tab bar for phones. */
function MobileTabBar({ pathname, onMenu }: { pathname: string; onMenu: () => void }) {
  const tabs: NavItem[] = [
    { href: "/app", label: "Home", icon: IconLayoutDashboard },
    { href: "/app/investments", label: "Trade", icon: IconCoins },
    { href: "/app/withdraw", label: "Cashier", icon: IconArrowUpRight },
    { href: "/app/explore", label: "Markets", icon: IconWorldSearch },
  ]
  return (
    <nav className="z-40 flex flex-shrink-0 items-stretch border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick navigation">
      {tabs.map((t) => {
        const active = isActive(pathname, t.href)
        const Glyph = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 py-2 transition-colors", active ? "text-brand" : "text-less")}
          >
            <Glyph className="h-5 w-5 flex-shrink-0" stroke={1.7} />
            <span className="w-full truncate text-center text-[10px] font-medium leading-none">{t.label}</span>
          </Link>
        )
      })}
      <button onClick={onMenu} className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-less" aria-label="Menu">
        <IconMenu2 className="h-5 w-5 flex-shrink-0" stroke={1.7} />
        <span className="w-full truncate text-center text-[10px] font-medium leading-none">Menu</span>
      </button>
    </nav>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const { data: stats } = useCachedFetch<{ totalAssets: number }>(user ? "/api/user/stats" : null, { ttl: 60_000 })

  // proxy.ts only checks the JWT signature; if the server says the session is
  // gone (revoked, expired, deleted) send the user back to sign in.
  React.useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, pathname, router])

  const isAdmin = user?.role === "admin"
  const closeMobile = () => setMobileOpen(false)
  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } finally {
      clearCache()
      window.location.href = "/login"
    }
  }
  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase()
  const balance = stats ? stats.totalAssets : null

  return (
    <NotificationProvider userId={user?.id} isAdmin={isAdmin}>
      <div className="flex h-dvh min-h-0 bg-background">
        {/* Sidebar: drawer below lg, static column from lg */}
        {mobileOpen && <div className="fixed inset-0 z-40 bg-[rgb(14_14_14/0.72)] lg:hidden" onClick={closeMobile} aria-hidden="true" />}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[264px] max-w-[85vw] flex-col border-r border-[color-mix(in_srgb,var(--border)_55%,transparent)] bg-sidebar transition-transform",
            "lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 lg:transition-none",
            mobileOpen ? "translate-x-0 elevation-xxl" : "-translate-x-full"
          )}
          aria-label="Sidebar"
        >
          <div className="flex h-14 flex-shrink-0 items-center justify-between px-4">
            <Link href="/app" aria-label="Elite Forex Hub">
              <BrandLockup />
            </Link>
            <button onClick={closeMobile} className="flex h-8 w-8 items-center justify-center rounded-[4px] text-less hover:bg-hover hover:text-foreground lg:hidden" aria-label="Close menu">
              <IconX className="h-4 w-4" stroke={2} />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto py-2" aria-label="Primary">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="pb-2">
                <div className="px-4 pb-1 pt-2 text-[12px] font-medium text-less">{group.label}</div>
                {group.items.map((item) => (
                  <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} onNavigate={closeMobile} />
                ))}
              </div>
            ))}
            {isAdmin && (
              <div className="pb-2">
                <div className="px-4 pb-1 pt-2 text-[12px] font-medium text-less">Admin</div>
                <SidebarLink item={{ href: "/app/admin", label: "Admin console", icon: IconAdjustments }} active={pathname.startsWith("/app/admin")} onNavigate={closeMobile} />
              </div>
            )}
          </nav>

          <div className="flex-shrink-0 border-t border-border p-3">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">{initial}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-foreground">{user?.name || user?.email || "Account"}</p>
                <p className="text-[12px] text-less">{isAdmin ? "Administrator" : "Investor"}</p>
              </div>
            </div>
            <button onClick={signOut} className="mt-1 flex h-10 w-full items-center gap-3 rounded-[4px] px-2 text-[14px] text-general transition-colors hover:bg-hover">
              <IconLogout className="h-5 w-5 text-less" stroke={1.7} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Header + content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-2 bg-[color-mix(in_srgb,var(--background)_55%,transparent)] px-3 backdrop-blur-2xl backdrop-saturate-150 sm:px-4 lg:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[4px] text-foreground hover:bg-hover lg:hidden"
              aria-label="Open menu"
            >
              <IconMenu2 className="h-5 w-5" stroke={1.7} />
            </button>
            <Link href="/app" className="flex items-center lg:hidden" aria-label="Elite Forex Hub">
              <BrandLockup />
            </Link>


            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link
                href="/app/transactions"
                className="hidden h-8 items-center gap-2 rounded-[4px] bg-surface px-3 text-[12px] font-medium tabular-nums text-foreground transition-colors hover:bg-hover sm:flex"
                title="Total assets"
              >
                <span className="text-less">USD</span>
                <span>{balance === null ? "—" : money(balance)}</span>
              </Link>
              <Link href="/app/investments" className="btn btn-primary btn-sm">
                Deposit
              </Link>
              <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>
            <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8 2xl:px-10">{children}</main>
          </div>
          <ToastNotification />
          <MobileTabBar pathname={pathname} onMenu={() => setMobileOpen(true)} />
        </div>
      </div>
    </NotificationProvider>
  )
}
