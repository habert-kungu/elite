"use client"

import * as React from "react"
import Link from "next/link"
import { Badge, ButtonLink, Card, buttonClass } from "@/components/ui"
import { BrandLockup } from "@/app/components/brand-logo"
import { SELECTABLE_PLANS, formatPlanAmount } from "@/lib/trading"
import {
  IconBrandTelegram,
  IconChartLine,
  IconChevronDown,
  IconClock24,
  IconReportAnalytics,
} from "@tabler/icons-react"

/* -------------------------------------------------------------------------
   Public landing page, Notion-style: white/`bg-background` throughout, a lot
   of whitespace, one big IBM Plex headline, two buttons and a real screenshot
   of the product as the only hero visual. No decorative gradients, no globe,
   no ticker. Plan cards are generated from the single source of truth in
   lib/trading.ts, so the marketing tiers can never drift from the app.
------------------------------------------------------------------------- */

const TELEGRAM_URL = "https://t.me/+ujxfTTqxAoE4ODNh"

const NAV_LINKS = [
  { href: "#plans", label: "Plans" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
]

function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex flex-shrink-0 items-center" aria-label="Elite Forex Hub home">
          <BrandLockup />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] leading-5 text-general transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Elite Forex Hub on Telegram"
            className={buttonClass({ variant: "tertiary", size: "sm", icon: true })}
          >
            <IconBrandTelegram className="h-4 w-4" stroke={1.8} />
          </a>
          <ButtonLink href="/login" variant="tertiary" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Get started
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const shotRef = React.useRef<HTMLDivElement>(null)

  // Entrance keyframes run first; once they finish we hand the transform over
  // to the scroll handler, which eases the tilt flat as the shot scrolls up.
  React.useEffect(() => {
    const el = shotRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let frame = 0
    const apply = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      // 1 while the shot sits at the bottom of the viewport, 0 once it reaches the top.
      const t = Math.max(0, Math.min(1, rect.top / Math.max(1, window.innerHeight)))
      el.style.setProperty("--shot-tilt", `${(t * 5).toFixed(2)}deg`)
      el.style.setProperty("--shot-scale", `${(1 - t * 0.02).toFixed(4)}`)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(apply)
    }
    const settle = () => {
      apply()
      el.classList.add("settled")
      window.addEventListener("scroll", onScroll, { passive: true })
      window.addEventListener("resize", onScroll)
    }
    el.addEventListener("animationend", settle, { once: true })
    return () => {
      el.removeEventListener("animationend", settle)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="overflow-hidden pt-16 md:pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hero-rise mx-auto max-w-3xl text-center">
          <h1 className="text-[40px] leading-[48px] font-bold tracking-[-0.02em] text-foreground md:text-[64px] md:leading-[72px]">
            Your capital, working around the clock.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-6 text-general md:mt-6 md:text-[20px] md:leading-[30px]">
            Pick a plan, fund it once and watch the cycle run to its payout. Every position, every
            payout and every withdrawal in one clear dashboard.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center md:mt-10">
            <ButtonLink href="/signup" className="md:h-16 md:px-6 md:text-[20px] md:leading-[30px]">
              Get started
            </ButtonLink>
            <a href="#plans" className={buttonClass({ variant: "secondary", className: "md:h-16 md:px-6 md:text-[20px] md:leading-[30px]" })}>
              See the plans
            </a>
          </div>

          <p className="mt-5 text-[12px] leading-[18px] text-less">
            Free to open an account · Withdrawals reviewed within 24 hours
          </p>
        </div>
      </div>

      {/* Product shot: the real app, rising into place on load and easing
          flat as the visitor scrolls. */}
      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 md:mt-16">
        <div ref={shotRef} className="hero-shot relative z-10 -mb-10 overflow-hidden rounded-[14px] bg-surface ring-1 ring-border elevation-xxl md:-mb-16">
          <img
            src="/images/app-overview-light.png"
            width={2880}
            height={1800}
            alt="The Elite Forex Hub dashboard showing an active cycle, balances and recent payouts"
            loading="eager"
            fetchPriority="high"
            className="block h-auto w-full dark:hidden"
          />
          <img
            src="/images/app-overview-dark.png"
            width={2880}
            height={1800}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            className="hidden h-auto w-full dark:block"
          />
        </div>
      </div>
    </section>
  )
}

function Plans() {
  return (
    <section id="plans" className="scroll-mt-20 pt-24 pb-16 md:pt-40 md:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="text-[24px] leading-[30px] font-bold tracking-[-0.01em] text-foreground md:text-[40px] md:leading-[48px]">
            One table, no surprises
          </h2>
          <p className="mt-4 text-[14px] leading-5 text-general md:text-[16px] md:leading-6">
            Every plan pays on a published tier. What you see here is exactly what the app pays out
            at the end of the cycle.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
          {SELECTABLE_PLANS.map((plan) => (
            <Card key={plan.key} className="reveal flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[16px] font-bold leading-6 text-foreground">{plan.name}</h3>
                {plan.popular && <Badge tone="brand">Popular</Badge>}
              </div>
              <p className="mt-1 text-[12px] leading-[18px] text-less">{plan.tagline}</p>

              <div className="mt-3">
                <Badge tone="neutral">
                  {plan.durationDays} {plan.durationDays === 1 ? "day" : "days"}
                </Badge>
              </div>

              <ul className="mt-5 flex-1 space-y-2">
                {plan.tiers.map((tier) => (
                  <li
                    key={tier.invest}
                    className="flex items-baseline justify-between gap-2 text-[12px] leading-[18px] md:text-[14px] md:leading-5"
                  >
                    <span className="tabular-nums text-general">
                      Invest {formatPlanAmount(tier.invest, plan.key)}
                    </span>
                    <span className="tabular-nums font-bold text-foreground">
                      {formatPlanAmount(tier.earn, plan.key)}
                    </span>
                  </li>
                ))}
              </ul>

              <ButtonLink
                href="/signup"
                variant={plan.popular ? "primary" : "secondary"}
                block
                className="mt-6"
              >
                Start this plan
              </ButtonLink>
            </Card>
          ))}
        </div>

        <p className="reveal mt-6 text-center text-[12px] leading-[18px] text-less">
          Amounts between two tiers are paid on a straight line between them.
        </p>
      </div>
    </section>
  )
}

const STEPS = [
  {
    title: "Pick a plan",
    desc: "Choose the duration and the tier that fits the amount you want to put to work.",
  },
  {
    title: "Send the funds",
    desc: "Fund the plan in USDT or BTC. The cycle starts as soon as the deposit is confirmed.",
  },
  {
    title: "Track the cycle live",
    desc: "Follow the position as it moves toward its target, then withdraw at payout.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="text-[24px] leading-[30px] font-bold tracking-[-0.01em] text-foreground md:text-[40px] md:leading-[48px]">
            How it works
          </h2>
          <p className="mt-4 text-[14px] leading-5 text-general md:text-[16px] md:leading-6">
            Three steps from signing up to a payout in your wallet.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <div key={step.title} className="reveal">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-[16px] font-bold leading-6 text-brand">
                {i + 1}
              </div>
              <h3 className="mt-4 text-[16px] font-bold leading-6 text-foreground md:text-[20px] md:leading-[30px]">
                {step.title}
              </h3>
              <p className="mt-2 text-[14px] leading-5 text-general">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: IconChartLine,
    title: "A live cycle chart",
    desc: "Watch the position advance toward its target in real time, not once a day.",
  },
  {
    icon: IconReportAnalytics,
    title: "Reports you can keep",
    desc: "Every deposit, payout and withdrawal is listed and exportable from your account.",
  },
  {
    icon: IconClock24,
    title: "Withdrawals in 24 hours",
    desc: "Requests are reviewed and settled within a day of the cycle closing.",
  },
]

function Features() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="text-[24px] leading-[30px] font-bold tracking-[-0.01em] text-foreground md:text-[40px] md:leading-[48px]">
            Built for clarity
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-3 md:gap-10">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="reveal">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" stroke={1.8} />
                </div>
                <h3 className="mt-4 text-[16px] font-bold leading-6 text-foreground">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-5 text-general">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const FAQS = [
  {
    q: "What do I need to open an account?",
    a: "An email address. Sign up, verify the code we send you and your dashboard is ready — you only fund a plan when you decide to start one.",
  },
  {
    q: "How much do I need to start?",
    a: "The daily plan starts at $300. The other plans have their own entry tiers, all listed in the table above.",
  },
  {
    q: "How is my payout calculated?",
    a: "Each plan has a published tier table. Your payout is fixed at the tier you fund, and amounts that fall between two tiers are paid on a straight line between them.",
  },
  {
    q: "When can I withdraw?",
    a: "As soon as a cycle completes, the payout lands in your balance. Withdrawal requests are reviewed and settled within 24 hours.",
  },
  {
    q: "Which currencies do you support?",
    a: "USDT for the daily, pro and 8 day plans, and BTC for the premium 12 day plan.",
  },
]

function FaqRow({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <Card className="reveal overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-hover"
      >
        <span className="text-[16px] font-bold leading-6 text-foreground">{q}</span>
        <IconChevronDown
          className={`h-4 w-4 flex-shrink-0 text-less transition-transform ${open ? "rotate-180" : ""}`}
          stroke={2}
        />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">{a}</p>
        </div>
      )}
    </Card>
  )
}

function Faq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="reveal text-center">
          <h2 className="text-[24px] leading-[30px] font-bold tracking-[-0.01em] text-foreground md:text-[40px] md:leading-[48px]">
            Questions, answered
          </h2>
        </div>

        <div className="mt-10 space-y-3 md:mt-14">
          {FAQS.map((f, i) => (
            <FaqRow
              key={f.q}
              q={f.q}
              a={f.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-surface py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="reveal text-[24px] leading-[30px] font-bold tracking-[-0.01em] text-foreground md:text-[40px] md:leading-[48px]">
          Put your capital to work today
        </h2>
        <p className="reveal mt-4 text-[14px] leading-5 text-general md:text-[16px] md:leading-6">
          Open an account in a minute and start your first cycle whenever you are ready.
        </p>
        <div className="reveal mt-8 flex justify-center">
          <ButtonLink href="/signup" className="md:h-16 md:px-6 md:text-[20px] md:leading-[30px]">
            Get started
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <Link href="/" aria-label="Elite Forex Hub home">
            <BrandLockup />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[12px] leading-[18px] text-less transition-colors hover:text-foreground md:text-[14px] md:leading-5"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              className="text-[12px] leading-[18px] text-less transition-colors hover:text-foreground md:text-[14px] md:leading-5"
            >
              Log in
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] leading-[18px] text-less transition-colors hover:text-foreground md:text-[14px] md:leading-5"
            >
              Telegram
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--background-hover)] pt-6 text-[12px] leading-[18px] text-less md:flex-row md:items-start md:justify-between">
          <p>© 2026 Elite Forex Hub</p>
          <p className="md:max-w-md md:text-right">
            Trading carries risk. Past results do not guarantee future returns — only invest what you
            can afford to lose.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return // content stays visible
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in")
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
      // Only below-fold elements hide-then-reveal; anything already on screen stays put.
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add("reveal-armed")
        io.observe(el)
      }
    })
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden bg-background">
        <Hero />
        <Plans />
        <HowItWorks />
        <Features />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
