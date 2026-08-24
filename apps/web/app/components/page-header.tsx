import type { ReactNode } from "react"

/**
 * Page title block. Deriv pages lead with an H3-bold title (24/32px) and a
 * P2 description in the less-prominent text colour; actions sit on the right.
 */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[12px] font-bold leading-[18px] text-brand">{eyebrow}</p>}
        <h1 className="text-[24px] font-bold leading-[30px] text-foreground md:text-[32px] md:leading-10">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
