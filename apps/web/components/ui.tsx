import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Shared product surface. Deriv-style: white/elevated surface, soft radius, and
 * a subtle shadow instead of a flat border. Replaces the 13 inline Card copies.
 */
export function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={cn("bg-card rounded-xl border border-border/70 elevation-sm", className)} style={style}>
      {children}
    </div>
  )
}

type PillTone = "success" | "danger" | "warning" | "info" | "neutral"

const PILL_TONES: Record<PillTone, string> = {
  success: "text-[var(--color-success)] bg-[var(--bg-success)]",
  danger: "text-[var(--destructive)] bg-[var(--bg-danger)]",
  warning: "text-[var(--color-warning)] bg-[var(--bg-warning)]",
  info: "text-[var(--color-info)] bg-[var(--bg-info)]",
  neutral: "text-muted-foreground bg-muted",
}

/** Status/label pill driven by semantic tokens (not hardcoded emerald/red). */
export function StatusPill({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: PillTone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        PILL_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Maps a domain status string to a pill tone. */
export function statusTone(status: string): PillTone {
  const s = status.toLowerCase()
  if (["active", "completed", "approved", "confirmed", "success"].includes(s)) return "success"
  if (["rejected", "failed", "cancelled", "canceled"].includes(s)) return "danger"
  if (["pending", "processing", "awaiting"].includes(s)) return "warning"
  return "neutral"
}
