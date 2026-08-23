"use client"

import * as React from "react"
import Link from "next/link"
import { Card } from "@/components/ui"

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}

export function StatGrid({ items }: { items: { label: string; value: React.ReactNode; className?: string }[] }) {
  return (
    <div className={`grid gap-3 ${items.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
      {items.map((s) => (
        <Card key={s.label} className="p-3 text-center">
          <div className={`text-lg font-medium tabular-nums ${s.className || "text-foreground"}`}>{s.value}</div>
          <div className="text-[10px] text-muted-foreground">{s.label}</div>
        </Card>
      ))}
    </div>
  )
}

export function FilterBar<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Card className="p-3">
      <div className="flex flex-wrap gap-2">
        {options.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
              value === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 elevation-sm sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"

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

// ---------------------------------------------------------------------------
// Row actions ("⋯" menu) and investor links
// ---------------------------------------------------------------------------

export type MenuItem = { label: string; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean; title?: string }

/** Compact "⋯" dropdown for per-row actions — keeps tables narrow and works with a thumb. */
export function ActionMenu({ items, label = "Actions" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("touchstart", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("touchstart", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-card py-1 elevation-sm">
          {items.map((it) =>
            it.href && !it.disabled ? (
              <a key={it.label} role="menuitem" href={it.href} className="block px-3 py-2 text-xs text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
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
                className={`block w-full px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${it.danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-secondary"}`}
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
    <Link href={`/app/admin/users/${id}`} className="group flex min-w-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-foreground ${size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[11px]"}`}>{initial}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-foreground group-hover:underline sm:text-[13px]">{name || email}</span>
        {name && <span className="block truncate text-[10px] text-muted-foreground">{email}</span>}
      </span>
    </Link>
  )
}

/** Label/value row for mobile cards. */
export function KV({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-xs ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums text-foreground">{children}</span>
    </div>
  )
}
