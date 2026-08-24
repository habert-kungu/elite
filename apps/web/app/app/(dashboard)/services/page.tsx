"use client"

import * as React from "react"
import { Badge, Card, buttonClass } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { IconBellRinging, IconBrandTelegram, IconCheck, IconSchool, IconVideo } from "@tabler/icons-react"

const SERVICES = [
  {
    name: "Live Trading Sessions",
    description:
      "Trade live alongside our senior analyst in a private 60-minute session tailored to your portfolio.",
    price: "$1,000",
    period: "per session",
    features: [
      "60-minute private video session",
      "Live market analysis",
      "Real-time trade walkthrough",
      "Session recording",
    ],
    popular: false,
    icon: IconVideo,
  },
  {
    name: "Crypto Mentorship",
    description:
      "A structured program to take you from beginner to confident crypto trader with weekly check-ins.",
    price: "$500",
    period: "per month",
    features: [
      "Personalised trading roadmap",
      "Weekly 1-on-1 check-in",
      "Private trading playbook",
      "Technical analysis",
      "Portfolio review",
    ],
    popular: true,
    icon: IconSchool,
  },
  {
    name: "VIP Signals",
    description:
      "High-probability trade signals delivered directly to your Telegram with precise entry and exit levels.",
    price: "$350",
    period: "per month",
    features: [
      "5-10 premium signals/week",
      "Entry, TP1, TP2 & stop-loss",
      "Monday briefing",
      "VIP-only group",
    ],
    popular: false,
    icon: IconBellRinging,
  },
]

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Services" description="Premium offerings to sharpen your trading. Every service is delivered one-to-one over Telegram." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SERVICES.map((service, i) => {
          const Glyph = service.icon
          return (
            <Card key={i} className="flex flex-col p-5 animate-fade-up sm:p-6" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Glyph className="h-5 w-5" stroke={1.8} />
                </div>
                {service.popular && <Badge tone="brand">Most popular</Badge>}
              </div>

              <h3 className="mt-4 text-[16px] font-bold leading-6 text-foreground">{service.name}</h3>
              <p className="mt-1 text-[12px] leading-[18px] text-less md:text-[14px] md:leading-5">{service.description}</p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold leading-9 tabular-nums text-foreground md:text-[32px] md:leading-10">{service.price}</span>
                <span className="text-[12px] leading-[18px] text-less">{service.period}</span>
              </div>

              <ul className="mt-4 flex-1 space-y-2.5">
                {service.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">
                    <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" stroke={2} />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="https://t.me/Patrickfxsignalelite"
                target="_blank"
                className={buttonClass({ variant: service.popular ? "primary" : "secondary", block: true, className: "mt-6" })}
              >
                <IconBrandTelegram className="h-4 w-4" stroke={1.8} />
                Contact via Telegram
              </a>
            </Card>
          )
        })}
      </div>

      <p className="text-[12px] leading-[18px] text-less">
        Prices are in USD. Services are billed separately from plan deposits and do not affect your account balance.
      </p>
    </div>
  )
}
