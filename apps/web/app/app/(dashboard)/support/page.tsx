"use client"


import { Card } from "@/components/ui"
import * as React from "react"
import Link from "next/link"

const FAQS = [
  {
    q: "How do I start investing?",
    a: "Create an account, choose a plan (48-Hour or Weekly Pool), and contact us via Telegram to initiate your investment.",
  },
  {
    q: "What is the minimum investment?",
    a: "The minimum investment is $500 USDT for both pools.",
  },
  {
    q: "How are returns calculated?",
    a: "Returns are fixed at 10x for both pools — e.g. $500 → $5,000 on the 48-Hour plan, $2,000 → $20,000 on the Weekly plan. No trading experience needed.",
  },
  {
    q: "When do I receive returns?",
    a: "48-Hour pool profits are paid within 48 hours. Weekly pool profits are paid after 7 days.",
  },
  {
    q: "Is my capital guaranteed?",
    a: "Yes, 100% track record of delivering promised returns. Risk management ensures capital protection.",
  },
  {
    q: "How do I withdraw?",
    a: "Go to Withdraw section, enter wallet address, select network, and submit request.",
  },
]

export default function SupportPage() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            Support
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Get help with your account
          </p>
        </div>
        <Link
          href="/app"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-medium text-foreground sm:mb-4 sm:text-base">
              Contact Us
            </h3>

            <a
              href="https://t.me/khan_bashiri"
              target="_blank"
              className="mb-3 flex items-center gap-3 rounded-xl bg-[oklch(0.21_0_0)/8] p-3 transition-colors hover:bg-[oklch(0.21_0_0)/12] sm:mb-4 sm:gap-4 sm:p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.21_0_0)/15] sm:h-12 sm:w-12">
                <svg
                  className="h-5 w-5 text-foreground sm:h-6 sm:w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 6.8-1.23 5.1-4.91 6.5-7.47 6.5-1.4 0-2.6-.8-3.4-1.8l-1.4 1.4c.9.9 2.4 1.5 3.8 1.5 4.3 0 8.6-3.3 9.8-7.3 1.1-3.6.7-5.6-.5-7.8l-1.4 1.4c.8 1.1 1.2 2.5 1.2 3.9z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  Telegram
                </div>
                <div className="text-xs text-muted-foreground">
                  Chat with us directly
                </div>
              </div>
            </a>

            <div className="rounded-xl bg-secondary p-3 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary sm:h-12 sm:w-12">
                  <svg
                    className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Email
                  </div>
                  <div className="text-xs text-muted-foreground">
                    support@nextlevel.com
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-medium text-foreground sm:mb-4 sm:text-base">
              Response Time
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  Telegram
                </span>
                <span className="text-xs font-medium text-[oklch(0.62_0.12_178)] sm:text-sm">
                  ~5 minutes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  Email
                </span>
                <span className="text-xs font-medium text-foreground sm:text-sm">
                  ~24 hours
                </span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-medium text-foreground sm:mb-4 sm:text-base">
            Frequently Asked Questions
          </h3>

          <div className="space-y-2 sm:space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-secondary/30 sm:p-4"
                >
                  <span className="text-xs font-medium text-foreground sm:text-sm">
                    {faq.q}
                  </span>
                  <svg
                    className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
