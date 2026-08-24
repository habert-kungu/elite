"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import { BrandLockup } from "@/app/components/brand-logo"

/**
 * Centered auth card (Deriv "Welcome back!" layout): the viewport is the
 * secondary surface, a single 440px card on the primary background, 16px
 * radius, elevation-lg, 32px padding, no border.
 *
 * `heading`/`tagline` are kept in the signature for existing callers; the
 * card only shows `title` and `subtitle`.
 */
export function AuthShell({ title, subtitle, children }: { heading?: string; tagline?: string; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 sm:px-6">
      <div className="w-full max-w-[440px] rounded-[16px] bg-background p-8 elevation-lg">
        <Link href="/" className="inline-flex" aria-label="Elite Forex Hub home">
          <BrandLockup />
        </Link>
        <h1 className="mt-6 text-[24px] font-bold leading-[30px] text-foreground md:text-[32px] md:leading-10">{title}</h1>
        {subtitle && <p className="mt-2 text-[14px] leading-5 text-general md:text-[16px] md:leading-6">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

/** Footer line under the form: P2 in `text-less`, link in brand bold. */
export function AuthFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-6 text-center text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5", className)}>{children}</p>
}

export const authLinkCls = "font-bold text-brand hover:underline"

/** Legacy aliases — resolve to the design-system recipes. */
export const authInputCls = "field"
export const authButtonCls = "btn btn-primary btn-block"
