"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/app/components/theme-toggle"
import { useAuth } from "@/app/providers/auth-provider"
import { NotificationProvider } from "@/app/providers/notification-provider"
import { NotificationBell, ToastNotification } from "@/app/components/notification-bell"
import { clearCache } from "@/lib/use-cached-fetch"
import { BrandLockup } from "@/app/components/brand-logo"
import { Badge, ButtonLink, Spinner } from "@/components/ui"
import { cn } from "@workspace/ui/lib/utils"
import {
  IconArrowsExchange,
  IconChartBar,
  IconCoins,
  IconLayoutDashboard,
  IconLogout,
  IconMail,
  IconMenu2,
  IconReceipt2,
  IconUsers,
  IconX,
} from "@tabler/icons-react"

/* -------------------------------------------------------------------------
   Admin shell: the same standard sidebar as the user app (persistent from
   lg, a drawer below), with an "Admin" badge next to the brand and a
   "User app" switch in the header.
------------------------------------------------------------------------- */

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string; stroke?: number }> }

const navItems: NavItem[] = [
  { href: "/app/admin", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/app/admin/deposits", label: "Deposits", icon: IconCoins },
  { href: "/app/admin/investments", label: "Investments", icon: IconChartBar },
  { href: "/app/admin/transactions", label: "Transactions", icon: IconReceipt2 },
  { href: "/app/admin/users", label: "Users", icon: IconUsers },
  { href: "/app/admin/communications", label: "Communications", icon: IconMail },
]

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
  const closeMobile = () => setMobileOpen(false)
  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
    } finally {
      clearCache()
      window.location.href = "/login"
    }
  }
  const initial = (user?.name || user?.email || "A").charAt(0).toUpperCase()

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-6 w-6 text-less" />
      </div>
    )
  }

  return (
    <NotificationProvider userId={user?.id} isAdmin>
      <div className="flex h-dvh min-h-0 bg-background">
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
            <Link href="/app/admin" className="flex items-center gap-2" aria-label="Elite Forex Hub admin">
              <BrandLockup />
              <Badge tone="brand">Admin</Badge>
            </Link>
            <button onClick={closeMobile} className="flex h-8 w-8 items-center justify-center rounded-[4px] text-less hover:bg-hover hover:text-foreground lg:hidden" aria-label="Close menu">
              <IconX className="h-4 w-4" stroke={2} />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto py-2" aria-label="Admin sections">
            <div className="pb-2">
              <div className="px-4 pb-1 pt-2 text-[12px] font-medium text-less">Manage</div>
              {navItems.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(item.href)} onNavigate={closeMobile} />
              ))}
            </div>
            <div className="pb-2">
              <div className="px-4 pb-1 pt-2 text-[12px] font-medium text-less">Apps</div>
              <SidebarLink item={{ href: "/app", label: "User app", icon: IconArrowsExchange }} active={false} onNavigate={closeMobile} />
            </div>
          </nav>

          <div className="flex-shrink-0 border-t border-border p-3">
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">{initial}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-foreground">{user?.name || user?.email}</p>
                <p className="text-[12px] text-less">Administrator</p>
              </div>
            </div>
            <button onClick={signOut} className="mt-1 flex h-10 w-full items-center gap-3 rounded-[4px] px-2 text-[14px] text-general transition-colors hover:bg-hover">
              <IconLogout className="h-5 w-5 text-less" stroke={1.7} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

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
            <Link href="/app/admin" className="flex items-center gap-2 lg:hidden" aria-label="Elite Forex Hub admin">
              <BrandLockup />
              <Badge tone="brand">Admin</Badge>
            </Link>
            <div className="hidden text-[12px] text-less lg:block">Admin console</div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <ButtonLink href="/app" variant="secondary" size="sm" className="hidden sm:inline-flex">
                User app
              </ButtonLink>
              <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>
            <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 pb-12 pt-5 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8 2xl:px-10">{children}</main>
          </div>
          <ToastNotification />
        </div>
      </div>
    </NotificationProvider>
  )
}
