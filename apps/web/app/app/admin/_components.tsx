"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, Card, Modal as UiModal, Segmented, Skeleton as Block, type BadgeTone } from "@/components/ui"
import { PageHeader as SharedPageHeader } from "@/app/components/page-header"
import { cn } from "@workspace/ui/lib/utils"
import { IconDotsVertical } from "@tabler/icons-react"
import { formatPlanAmount, poolLabel as planLabel } from "@/lib/trading"

/* -------------------------------------------------------------------------
   Shared admin building blocks on the Deriv primitives. Every export keeps
   its original name and prop signature so the admin pages compile unchanged.
------------------------------------------------------------------------- */

/** Page title block — thin wrapper over the shared PageHeader. */
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <SharedPageHeader title={title} description={subtitle} actions={right} />
}

/** Summary strip: one Card with divided cells (Reports → summary row). */
export function StatGrid({ items }: { items: { label: string; value: React.ReactNode; className?: string }[] }) {
  const cols = items.length === 4 ? "grid-cols-2 lg:grid-cols-4" : items.length === 2 ? "grid-cols-2" : "grid-cols-3"
  return (
    <Card className={cn("grid divide-y divide-[var(--background-hover)] sm:divide-y-0 sm:divide-x", cols)}>
      {items.map((s) => (
        <div key={s.label} className="min-w-0 px-4 py-4 sm:px-6">
          <div className="text-[12px] leading-[18px] text-less">{s.label}</div>
          <div className={cn("mt-0.5 truncate text-[20px] font-bold leading-[30px] tabular-nums md:text-[24px] md:leading-9", s.className || "text-foreground")}>{s.value}</div>
        </div>
      ))}
    </Card>
  )
}

/** Small filter row (Segmented control). */
export function FilterBar<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="overflow-x-auto">
      <Segmented<T> items={options.map((o) => ({ value: o.key, label: o.label }))} value={value} onChange={onChange} />
    </div>
  )
}

/** Loading placeholder for a list page: title, summary strip, rows. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <Block className="h-8 w-40" />
      <Block className="h-24 w-full rounded-[16px]" />
      <Block className="h-8 w-64" />
      <div className="d-card overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
            <Block className="h-8 w-8 rounded-full" />
            <Block className="h-4 w-40" />
            <Block className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Dialog — the shared Deriv Modal (8px radius, 2px header border, footer buttons). */
export function Modal({ open, onClose, title, children, footer, size }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <UiModal open={open} onClose={onClose} title={title} footer={footer} size={size}>
      {children}
    </UiModal>
  )
}

/** Raw input recipe for the few places that can't use <TextField>. */
export const inputCls = "field"

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : formatDate(dateStr)
}

/** Badge tone for a transaction type. */
export function txTypeTone(type: string): BadgeTone {
  switch (type) {
    case "deposit":
    case "investment":
      return "success"
    case "return":
      return "info"
    case "withdrawal":
      return "danger"
    default:
      return "neutral"
  }
}

/**
 * Plan label for a stored pool key. `long` gives the full plan name
 * ("Pro 5 days"); the default is the short name ("Pro").
 */
export function poolLabel(pool: string, long = false) {
  return planLabel(pool, !long)
}

/** Amount in the plan's own currency — "$2,000" for USD plans, "₿1.5" for the BTC plan. */
export function planAmount(amount: number, pool: string, digits?: number) {
  return formatPlanAmount(amount, pool, digits)
}

/** Thin cycle progress bar (success fill on the hover surface). */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 overflow-hidden rounded-full bg-hover", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row actions ("⋯" menu) and investor links
// ---------------------------------------------------------------------------

export type MenuItem = { label: string; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean; title?: string }

/**
 * Compact "⋯" popover for per-row actions. The menu is positioned fixed from
 * the trigger's rect so it is never clipped by an overflow-hidden table card.
 */
export function ActionMenu({ items, label = "Actions" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)
  const btnRef = React.useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) })
    }
    setOpen((o) => !o)
  }

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onScroll = () => setOpen(false)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("touchstart", onDoc)
    document.addEventListener("keydown", onKey)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("touchstart", onDoc)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
    }
  }, [open])

  const rowCls = "flex h-10 w-full items-center px-4 text-left text-[14px] transition-colors"

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex h-8 w-8 items-center justify-center rounded-[4px] text-less transition-colors hover:bg-hover hover:text-foreground"
      >
        <IconDotsVertical className="h-4 w-4" stroke={2} />
      </button>
      {open && pos && (
        <div role="menu" style={{ top: pos.top, right: pos.right }} className="fixed z-[90] w-56 overflow-hidden rounded-[8px] bg-background py-1 elevation-lg ring-1 ring-border">
          {items.map((it) =>
            it.href && !it.disabled ? (
              <a key={it.label} role="menuitem" href={it.href} className={cn(rowCls, "text-general hover:bg-hover")} onClick={() => setOpen(false)}>
                {it.label}
              </a>
            ) : (
              <button
                key={it.label}
                role="menuitem"
                type="button"
                disabled={it.disabled}
                title={it.title}
                onClick={() => {
                  setOpen(false)
                  it.onClick?.()
                }}
                className={cn(rowCls, "disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent", it.danger ? "text-destructive hover:bg-danger-soft" : "text-general hover:bg-hover")}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

/** Avatar + name + email that links to the investor's page. */
export function InvestorLink({ id, name, email, size = "md" }: { id: string; name?: string | null; email: string; size?: "sm" | "md" }) {
  const initial = (name || email).charAt(0).toUpperCase()
  return (
    <Link href={`/app/admin/users/${id}`} className="group flex min-w-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <span className={cn("flex flex-shrink-0 items-center justify-center rounded-full bg-active font-bold text-foreground", size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-[12px]")}>{initial}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-bold leading-5 text-foreground group-hover:underline">{name || email}</span>
        {name && <span className="block truncate text-[12px] leading-[18px] text-less">{email}</span>}
      </span>
    </Link>
  )
}

/** Label/value row for stacked mobile rows. */
export function KV({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 text-[12px] leading-[18px]", className)}>
      <span className="text-less">{label}</span>
      <span className="text-right font-bold tabular-nums text-foreground">{children}</span>
    </div>
  )
}

/** Role badge (admin = info, user = neutral). */
export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge tone={role === "admin" ? "info" : "neutral"} className="capitalize">
      {role}
    </Badge>
  )
}
