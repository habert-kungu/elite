"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

/** Client-side pagination state + current page slice. */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = React.useState(1)
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // Clamp for rendering so a shrinking list (e.g. after filtering) never leaves
  // us on an out-of-range page — no setState-in-effect needed.
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  const pageItems = items.slice(start, end)

  return { page: safePage, setPage, pageCount, pageItems, total, start, end, pageSize }
}

/** Builds a compact page list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 20]. */
function pageRange(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const pages: (number | "…")[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(count - 1, current + 1)
  if (left > 2) pages.push("…")
  for (let p = left; p <= right; p++) pages.push(p)
  if (right < count - 1) pages.push("…")
  pages.push(count)
  return pages
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  start,
  end,
  className = "",
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  total?: number
  start?: number
  end?: number
  className?: string
}) {
  if (pageCount <= 1) return null

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {typeof total === "number" && total > 0 && (
        <p className="text-[12px] text-muted-foreground">
          Showing <span className="font-medium text-foreground tabular-nums">{(start ?? 0) + 1}</span>–
          <span className="font-medium text-foreground tabular-nums">{end ?? 0}</span> of{" "}
          <span className="font-medium text-foreground tabular-nums">{total}</span>
        </p>
      )}

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button className={cn(btn, "border border-border hover:bg-secondary")} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        {/* Numbered pages on wider screens */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageRange(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-[13px] text-muted-foreground">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(btn, p === page ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary")}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Compact "Page X of Y" on mobile */}
        <span className="px-2 text-[12px] text-muted-foreground tabular-nums sm:hidden">
          {page} / {pageCount}
        </span>

        <button className={cn(btn, "border border-border hover:bg-secondary")} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </nav>
    </div>
  )
}
