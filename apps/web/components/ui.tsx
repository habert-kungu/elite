"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import { IconX } from "@tabler/icons-react"

/* -------------------------------------------------------------------------
   Deriv Design System primitives (zeroheight.com/36313d3c8)
   Every visual value here comes from the system: cards are 16px radius on the
   secondary background, buttons 4px radius with bold labels, badges 2px,
   modals 8px with a 2px header border, text fields 8px with a 1px border.
------------------------------------------------------------------------- */

/** Card — "surfaces that display content and actions on a single topic". */
export function Card({
  children,
  className = "",
  style,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  as?: "div" | "section" | "article"
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "style" | "children">) {
  return (
    <Tag className={cn("d-card", className)} style={style} {...rest}>
      {children}
    </Tag>
  )
}

/** Card header row: title (Sub 2 bold) + optional description/action. */
export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[16px] font-bold leading-6 text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">{description}</p>}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

/* ----------------------------- Buttons -------------------------------- */

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger" | "success" | "brand-soft"
export type ButtonSize = "xs" | "sm" | "md" | "hero"

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  tertiary: "btn-tertiary",
  danger: "btn-danger",
  success: "btn-success",
  "brand-soft": "btn-brand-soft",
}
const BTN_SIZE: Record<ButtonSize, string> = { xs: "btn-xs", sm: "btn-sm", md: "", hero: "btn-hero" }

export function buttonClass({ variant = "primary", size = "md", block, icon, className }: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: boolean; className?: string } = {}) {
  return cn("btn", BTN_VARIANT[variant], BTN_SIZE[size], block && "btn-block", icon && "btn-icon", className)
}

type ButtonBase = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: boolean; loading?: boolean; className?: string }

export function Button({ variant, size, block, icon, loading, className, children, disabled, type = "button", ...rest }: ButtonBase & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, icon, className })} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, block, icon, className, children, href, ...rest }: ButtonBase & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass({ variant, size, block, icon, className })} {...rest}>
      {children}
    </Link>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------ Badges -------------------------------- */

export type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral" | "brand"

const BADGE_TONES: Record<BadgeTone, string> = {
  success: "tag-green",
  danger: "tag-red",
  warning: "tag-amber",
  info: "tag-blue",
  neutral: "tag-default",
  brand: "tag-brand",
}

/** Badge — "status indicators meant to register meaning at a glance". */
export function Badge({ tone = "neutral", children, className = "", dot }: { tone?: BadgeTone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("tag", BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Kept for existing callers; identical to Badge. */
export const StatusPill = Badge
export type PillTone = BadgeTone

/** Maps a domain status string to a badge tone. */
export function statusTone(status: string): BadgeTone {
  const s = status.toLowerCase()
  if (["active", "completed", "approved", "confirmed", "success", "paid"].includes(s)) return "success"
  if (["rejected", "failed", "cancelled", "canceled", "suspended"].includes(s)) return "danger"
  if (["pending", "processing", "awaiting", "review"].includes(s)) return "warning"
  return "neutral"
}

/* --------------------------- Text fields ------------------------------ */

type FieldShellProps = { label?: React.ReactNode; required?: boolean; help?: React.ReactNode; error?: React.ReactNode; className?: string; id?: string }

function FieldShell({ label, required, help, error, className, id, children }: FieldShellProps & { children: React.ReactNode }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-brand">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error-text">{error}</p> : help ? <p className="field-help">{help}</p> : null}
    </div>
  )
}

export function TextField({ label, required, help, error, className, inputClassName, leading, trailing, size, ...rest }: FieldShellProps & { inputClassName?: string; leading?: React.ReactNode; trailing?: React.ReactNode; size?: "md" | "lg" } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "className">) {
  const id = rest.id ?? rest.name
  return (
    <FieldShell label={label} required={required} help={help} error={error} className={className} id={id}>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-less">{leading}</span>}
        <input
          id={id}
          className={cn("field", size === "lg" && "field-lg", error && "field-error", leading && "pl-10", trailing && "pr-10", inputClassName)}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-less">{trailing}</span>}
      </div>
    </FieldShell>
  )
}

export function TextArea({ label, required, help, error, className, inputClassName, ...rest }: FieldShellProps & { inputClassName?: string } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  const id = rest.id ?? rest.name
  return (
    <FieldShell label={label} required={required} help={help} error={error} className={className} id={id}>
      <textarea id={id} className={cn("field", error && "field-error", inputClassName)} aria-invalid={error ? true : undefined} {...rest} />
    </FieldShell>
  )
}

export function Select({ label, required, help, error, className, inputClassName, children, ...rest }: FieldShellProps & { inputClassName?: string } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  const id = rest.id ?? rest.name
  return (
    <FieldShell label={label} required={required} help={help} error={error} className={className} id={id}>
      <div className="relative">
        <select id={id} className={cn("field appearance-none", error && "field-error", inputClassName)} aria-invalid={error ? true : undefined} {...rest}>
          {children}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-less" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
    </FieldShell>
  )
}

/* ------------------------------- Tabs --------------------------------- */

export function Tabs<T extends string>({ items, value, onChange, fill, className }: { items: { value: T; label: React.ReactNode; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void; fill?: boolean; className?: string }) {
  return (
    <div role="tablist" className={cn("tabs overflow-x-auto", fill && "tabs-fill", className)}>
      {items.map((it) => (
        <button key={it.value} role="tab" type="button" aria-selected={it.value === value} className="tab" onClick={() => onChange(it.value)}>
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** Contained/segmented control (timeframes, filters). */
export function Segmented<T extends string | number>({ items, value, onChange, className }: { items: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("segment", className)}>
      {items.map((it) => (
        <button key={String(it.value)} role="tab" type="button" aria-selected={it.value === value} className="segment-item" onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------- Modal -------------------------------- */

/**
 * Modal (Modal page): 440px dialog, 8px radius, header with 2px bottom border,
 * 24px padding, right-aligned footer buttons. Mobile: full width, bottom sheet.
 */
export function Modal({ open, onClose, title, children, footer, size = "md", className }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: "max-w-[360px]", md: "max-w-[440px]", lg: "max-w-[560px]", xl: "max-w-[720px]" }[size]
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgb(14_14_14/0.72)] p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div role="dialog" aria-modal="true" className={cn("flex max-h-[92dvh] w-full flex-col rounded-t-[8px] bg-background elevation-xxl sm:rounded-[8px]", width, className)}>
        {title !== undefined && (
          <div className="flex h-14 flex-shrink-0 items-center justify-between border-b-2 border-[var(--background-hover)] px-6">
            <h2 className="text-[14px] font-bold leading-5 text-foreground md:text-[16px] md:leading-6">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-8 w-8 items-center justify-center rounded-[4px] text-less transition-colors hover:bg-hover hover:text-foreground">
              <IconX className="h-4 w-4" stroke={2} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 text-[14px] leading-5 text-general">{children}</div>
        {footer && <div className="flex flex-shrink-0 flex-col-reverse gap-2 px-6 pb-6 pt-0 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------ Misc ---------------------------------- */

/** Inline notice (Banner page): left icon, P2 text, 8px radius, tinted bg. */
export function Notice({ tone = "info", children, className, icon }: { tone?: "info" | "success" | "warning" | "danger" | "neutral"; children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  const tones = {
    info: "bg-info-soft text-foreground [--tone:var(--info)]",
    success: "bg-success-soft text-foreground [--tone:var(--success)]",
    warning: "bg-warning-soft text-foreground [--tone:var(--warning)]",
    danger: "bg-danger-soft text-foreground [--tone:var(--destructive)]",
    neutral: "bg-surface text-foreground [--tone:var(--foreground-tertiary)]",
  }
  return (
    <div className={cn("flex items-start gap-3 rounded-[8px] px-4 py-3 text-[12px] leading-[18px] md:text-[14px] md:leading-5", tones[tone], className)} role={tone === "danger" ? "alert" : undefined}>
      {icon && <span className="mt-0.5 flex-shrink-0 text-[var(--tone)]">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Key/value stat used in summary rows. */
export function Stat({ label, value, hint, tone, className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; tone?: "success" | "danger" | "brand"; className?: string }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : tone === "brand" ? "text-brand" : "text-foreground"
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[12px] leading-[18px] text-less">{label}</div>
      <div className={cn("truncate text-[20px] font-bold leading-[30px] tabular-nums md:text-[24px] md:leading-9", color)}>{value}</div>
      {hint && <div className="text-[12px] leading-[18px] text-less">{hint}</div>}
    </div>
  )
}

/** Empty state block. */
export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-hover text-less">{icon}</div>}
      <div className="text-[14px] font-bold leading-5 text-foreground md:text-[16px] md:leading-6">{title}</div>
      {description && <p className="mt-1 max-w-sm text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Skeleton block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[4px] bg-hover", className)} />
}
