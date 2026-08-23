"use client"

import * as React from "react"
import Link from "next/link"

/** Split-screen auth layout shared by the password-recovery pages. */
export function AuthShell({ heading, tagline, title, subtitle, children }: { heading: string; tagline: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden overflow-hidden bg-[oklch(0.145_0_0)] lg:flex lg:w-[45%]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/login-bg.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.145_0_0)] via-[oklch(0.145_0_0)/0.7] to-transparent" />
        <div className="relative z-10 flex w-full flex-col justify-between p-8">
          <div />
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white">{heading}</h2>
            <p className="mx-auto max-w-sm text-sm text-white/60">{tagline}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>© 2026 AlphaReserve</span>
            <span>Secure</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <svg className="h-5 w-5 text-background" viewBox="0 0 44 45" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M18.4201 9.7905C19.2053 10.2438 19.4743 11.2477 19.021 12.0329L10.8134 26.2488C10.3601 27.034 9.35616 27.3029 8.57104 26.8497C7.78592 26.3964 7.51689 25.3924 7.9702 24.6073L16.1778 10.3913C16.6311 9.60622 17.635 9.33722 18.4201 9.7905ZM27.7561 13.3169C28.5412 13.7702 28.8102 14.7741 28.3569 15.5592L18.5078 32.6184C18.0545 33.4035 17.0506 33.6725 16.2655 33.2192C15.4803 32.7659 15.2113 31.762 15.6646 30.9769L25.5137 13.9177C25.967 13.1326 26.9709 12.8636 27.7561 13.3169ZM36.7357 20.7424C37.2646 19.8265 37.0569 18.7165 36.2717 18.2632C35.4866 17.8099 34.4214 18.185 33.8926 19.1009L24.317 35.6862C23.7882 36.6022 23.9959 37.7122 24.7811 38.1655C25.5662 38.6188 26.6314 38.2437 27.1602 37.3277L36.7357 20.7424Z" fill="currentColor" /></svg>
              </div>
              <span className="text-lg font-semibold text-foreground">AlphaReserve</span>
            </Link>
          </div>
          <h1 className="mb-1 text-xl font-bold text-foreground">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export const authInputCls =
  "w-full px-3 py-2.5 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors text-sm bg-background"
export const authButtonCls =
  "w-full py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
