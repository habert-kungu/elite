import { cn } from "@workspace/ui/lib/utils"

/**
 * Elite Forex Hub mark in the Deriv brand language: a folded chevron built
 * from the letter "E", filled with the Coral red → Tomato gradient, with a
 * Brick red fold for depth (Brand → About the logo). `mono` renders the
 * single-colour variant for use on brand-red surfaces.
 */
export function BrandLogo({ className, mono }: { className?: string; mono?: "light" | "dark" }) {
  const id = "efh-coral"
  const fill = mono === "light" ? "#ffffff" : mono === "dark" ? "#0e0e0e" : `url(#${id})`
  const fold = mono === "light" ? "rgba(0,0,0,0.22)" : mono === "dark" ? "rgba(255,255,255,0.32)" : "#d4a017"
  return (
    <svg className={cn("h-8 w-8", className)} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      {!mono && (
        <defs>
          <linearGradient id={id} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffc71b" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
        </defs>
      )}
      {/* Main body: rounded right edge, chevron notch on the left */}
      <path
        d="M8 4h17c6.075 0 11 4.925 11 11v10c0 6.075-4.925 11-11 11H8l8-16L8 4z"
        fill={fill}
      />
      {/* Fold: the lower arm tucks behind the body */}
      <path d="M8 36l8-16 5 0-7.2 16H8z" fill={fold} />
    </svg>
  )
}

/** Logo + wordmark lockup. */
export function BrandLockup({ className, compact, mono }: { className?: string; compact?: boolean; mono?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandLogo className="h-8 w-8 flex-shrink-0" mono={mono} />
      {!compact && (
        <span className={cn("text-[18px] font-bold leading-none tracking-[-0.01em]", mono === "light" ? "text-white" : mono === "dark" ? "text-[#0e0e0e]" : "text-foreground")}>
          elite<span className={mono ? "" : "text-brand"}>.</span>
        </span>
      )}
    </span>
  )
}
