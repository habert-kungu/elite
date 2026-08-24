"use client"

import * as React from "react"
import { Card, CardHeader, Notice, buttonClass } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { IconBrandTelegram, IconMessage, IconScale, IconShieldCheck, IconShieldLock, IconTargetArrow, IconTrendingDown } from "@tabler/icons-react"

const rules = [
  {
    number: "01",
    title: "1–2% Risk Per Trade Maximum",
    description:
      "No single trade ever risks more than 2% of the total pool capital. This means even a string of losing trades cannot significantly damage the pool — your returns are mathematically protected.",
  },
  {
    number: "02",
    title: "Minimum 3:1 Reward-to-Risk Ratio",
    description:
      "Every trade is only entered when the potential reward is at least 3× the risk. An 89% win rate combined with a 3:1 R:R means the pool grows consistently even when some trades lose.",
  },
  {
    number: "03",
    title: "Stop-Loss on Every Single Trade",
    description:
      "No trade is ever entered without a predefined stop-loss. This is non-negotiable. Stop losses are placed at key market structure levels — not arbitrary distances — to give trades maximum room while capping downside.",
  },
  {
    number: "04",
    title: "5% Maximum Drawdown Per Cycle",
    description:
      "If the pool draws down more than 5% in any single cycle, all trades are paused and reviewed. This hard ceiling ensures that a bad run never threatens client returns. The cycle target is always hit before payouts.",
  },
]

type Tone = "red" | "amber" | "green" | "blue"

const riskCards: { title: string; subtitle: string; icon: React.ComponentType<{ className?: string; stroke?: number }>; color: Tone; items: { text: string; status: Tone }[] }[] = [
  {
    title: "Drawdown control",
    subtitle: "Maximum loss limits per cycle",
    icon: IconTrendingDown,
    color: "red",
    items: [
      {
        text: "Daily drawdown cap: 2% max in any single trading day",
        status: "green",
      },
      {
        text: "Cycle drawdown cap: 5% max before all positions are paused",
        status: "green",
      },
      {
        text: "Recovery mode: Position size reduced 50% after any 3% drawdown",
        status: "green",
      },
    ],
  },
  {
    title: "Position sizing",
    subtitle: "How each trade size is calculated",
    icon: IconScale,
    color: "amber",
    items: [
      {
        text: "Kelly Criterion sizing: Position size mathematically optimized based on win rate and R:R",
        status: "amber",
      },
      {
        text: "Max exposure used: 1:10 — never more, often less",
        status: "amber",
      },
      {
        text: "Scaling in: Large positions split into 2–3 entries to reduce average entry risk",
        status: "amber",
      },
      {
        text: "Correlation check: Never hold more than 2 highly correlated pairs at once",
        status: "amber",
      },
    ],
  },
  {
    title: "Take profit system",
    subtitle: "How profits are locked in",
    icon: IconTargetArrow,
    color: "green",
    items: [
      {
        text: "Partial closes: 50% of position closed at 2:1 R:R, remainder runs to full target",
        status: "green",
      },
      {
        text: "Trailing stops: Once 2:1 is hit, stop-loss moved to breakeven — risk becomes zero",
        status: "green",
      },
      {
        text: "Target levels: Set at key liquidity zones and previous structure highs/lows",
        status: "green",
      },
      {
        text: "No greed rule: Once daily target is hit, trading stops for that session",
        status: "green",
      },
    ],
  },
  {
    title: "Capital safeguards",
    subtitle: "How your investment is protected",
    icon: IconShieldLock,
    color: "blue",
    items: [
      {
        text: "Segregated pool funds: Client capital kept separate from operational funds",
        status: "blue",
      },
      {
        text: "No overnight risk on scalps: All intraday positions closed before session end",
        status: "blue",
      },
      {
        text: "News avoidance: All positions closed 30 minutes before major news events",
        status: "blue",
      },
      {
        text: "Guaranteed returns: The pool is designed so target return is always achievable",
        status: "blue",
      },
    ],
  },
]

/** Semantic tokens per tone so the cards work in both themes. */
const TONE: Record<Tone, { wrap: string; dot: string }> = {
  red: { wrap: "bg-danger-soft text-destructive", dot: "bg-destructive" },
  amber: { wrap: "bg-warning-soft text-warning", dot: "bg-warning" },
  green: { wrap: "bg-success-soft text-success", dot: "bg-success" },
  blue: { wrap: "bg-info-soft text-info", dot: "bg-info" },
}

export default function RiskPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Risk management" description="Protecting your capital: the framework every trade, position and pool cycle follows without exception." />

      <Notice tone="warning" icon={<IconShieldCheck className="h-4 w-4" stroke={1.8} />}>
        <span className="font-bold">Your capital is always protected.</span> Elite Forex Hub operates under a strict risk management framework. Every trade, every position, and every pool cycle follows these rules without exception.
      </Notice>

      {/* Core rules */}
      <section className="space-y-3">
        <h2 className="text-[16px] font-bold leading-6 text-foreground">Core risk rules</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rules.map((rule, i) => (
            <Card key={rule.number} className="flex gap-4 p-5 animate-fade-up sm:p-6" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-[14px] font-bold tabular-nums text-brand">
                {rule.number}
              </div>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold leading-6 text-foreground">{rule.title}</h3>
                <p className="mt-1 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">{rule.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Controls */}
      <section className="space-y-3">
        <h2 className="text-[16px] font-bold leading-6 text-foreground">How the framework works</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {riskCards.map((card, i) => {
            const Glyph = card.icon
            const tone = TONE[card.color]
            return (
              <Card key={card.title} className="p-5 animate-fade-up sm:p-6" style={{ animationDelay: `${240 + i * 60}ms` }}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${tone.wrap}`}>
                    <Glyph className="h-5 w-5" stroke={1.8} />
                  </div>
                  <CardHeader title={card.title} description={card.subtitle} />
                </div>

                <ul className="mt-4 divide-y divide-[var(--background-hover)]">
                  {card.items.map((item, j) => {
                    const [head, ...rest] = item.text.split(":")
                    return (
                      <li key={j} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TONE[item.status].dot}`} />
                        <p className="text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">
                          <span className="font-bold text-foreground">{head}:</span>
                          {rest.length ? rest.join(":") : ""}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Message from the desk */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <IconMessage className="h-5 w-5" stroke={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold leading-6 text-foreground">A message from the trading desk</h3>
            <p className="mt-1 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">
              Every cent in this pool is treated as if it belongs to us personally. Our risk management system was built over years of live trading.
            </p>
          </div>
          <a href="https://t.me/khan_bashiri" target="_blank" rel="noreferrer" className={buttonClass({ className: "flex-shrink-0" })}>
            <IconBrandTelegram className="h-4 w-4" stroke={1.8} />
            Message on Telegram
          </a>
        </div>
      </Card>
    </div>
  )
}
