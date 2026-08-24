"use client"

import * as React from "react"
import { Badge, Card, CardHeader, Tabs } from "@/components/ui"
import type { BadgeTone } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCurrencyDollar,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"

/* -------------------------------------------------------------------------
   Research — desk notes rather than performance claims: what the trading
   desk is watching, a read on each instrument, and the events that move
   them. Content is editorial and static; nothing here promises a return.
------------------------------------------------------------------------- */

type Bias = "bullish" | "bearish" | "neutral"

const BIAS: Record<Bias, { label: string; tone: BadgeTone; icon: typeof IconTrendingUp }> = {
  bullish: { label: "Bullish", tone: "success", icon: IconTrendingUp },
  bearish: { label: "Bearish", tone: "danger", icon: IconTrendingDown },
  neutral: { label: "Neutral", tone: "neutral", icon: IconCurrencyDollar },
}

type Note = {
  symbol: string
  name: string
  bias: Bias
  level: string
  note: string
}

const CRYPTO_NOTES: Note[] = [
  {
    symbol: "BTC/USDT",
    name: "Bitcoin",
    bias: "neutral",
    level: "76,000 – 78,500",
    note: "Range-bound after the last leg up. The desk is treating 76k as the line that matters — losing it on a daily close opens the gap beneath, holding it keeps the range intact. We size smaller inside ranges and wait for the break rather than anticipating it.",
  },
  {
    symbol: "ETH/USDT",
    name: "Ethereum",
    bias: "bullish",
    level: "2,380 – 2,520",
    note: "Leading BTC on the way up and lagging it on the way down, which is the behaviour we look for before rotating weight into ETH. A daily close back under 2,380 would cancel the read.",
  },
  {
    symbol: "SOL/USDT",
    name: "Solana",
    bias: "bullish",
    level: "88 – 97",
    note: "The high-beta expression of the same trend. It pays more when the move works and costs more when it doesn't, so it takes a smaller share of cycle capital than BTC or ETH.",
  },
  {
    symbol: "XRP/USDT",
    name: "XRP",
    bias: "neutral",
    level: "1.42 – 1.55",
    note: "Headline-driven and prone to moves that reverse within the session. Traded only on confirmation, and closed ahead of scheduled announcements rather than held through them.",
  },
]

const FOREX_NOTES: Note[] = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    bias: "bearish",
    level: "1.1620 – 1.1750",
    note: "Rate differentials still favour the dollar. We fade rallies into the top of the range while that holds, and stand aside into the ECB decision rather than guessing it.",
  },
  {
    symbol: "GBP/USD",
    name: "Sterling / US Dollar",
    bias: "neutral",
    level: "1.3580 – 1.3720",
    note: "Cleaner trends than EUR but thinner liquidity outside the London session, so positions are opened at the London open and rarely carried into the Asian session.",
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Yen",
    bias: "bullish",
    level: "157.0 – 159.5",
    note: "Trending, with intervention risk the whole way up. That risk is the reason for the stop, not a reason to avoid the trade — but position size stays deliberately modest.",
  },
  {
    symbol: "XAU/USD",
    name: "Gold",
    bias: "bullish",
    level: "2,610 – 2,680",
    note: "Works as the hedge when risk assets wobble. Held as ballast against the crypto book rather than as a directional bet of its own.",
  },
]

type Impact = "high" | "medium"

const EVENTS: { day: number; time: string; region: string; title: string; impact: Impact }[] = [
  { day: 0, time: "15:30", region: "United States", title: "Consumer price index", impact: "high" },
  { day: 1, time: "14:00", region: "Euro area", title: "ECB rate decision", impact: "high" },
  { day: 1, time: "15:30", region: "United States", title: "Initial jobless claims", impact: "medium" },
  { day: 2, time: "10:00", region: "United Kingdom", title: "GDP (quarterly)", impact: "medium" },
  { day: 3, time: "15:30", region: "United States", title: "Non-farm payrolls", impact: "high" },
]

function NoteRow({ note }: { note: Note }) {
  const bias = BIAS[note.bias]
  const Glyph = bias.icon
  const tint =
    note.bias === "bullish"
      ? "bg-success-soft text-success"
      : note.bias === "bearish"
        ? "bg-danger-soft text-destructive"
        : "bg-hover text-less"
  return (
    <div className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tint}`}>
        <Glyph className="h-4 w-4" stroke={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-bold text-foreground md:text-[16px]">{note.symbol}</span>
          <span className="text-[12px] text-less">{note.name}</span>
          <Badge tone={bias.tone}>{bias.label}</Badge>
        </div>
        <p className="mt-1.5 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">{note.note}</p>
        <p className="mt-2 text-[12px] leading-[18px] text-less">
          Level in focus <span className="font-medium text-foreground">{note.level}</span>
        </p>
      </div>
    </div>
  )
}

export default function ResearchPage() {
  const [tab, setTab] = React.useState<"crypto" | "forex" | "calendar">("crypto")

  // Dates are derived on the client so the calendar never shows a stale week.
  const [dates, setDates] = React.useState<string[] | null>(null)
  React.useEffect(() => {
    const today = new Date()
    setDates(
      EVENTS.map((e) => {
        const d = new Date(today)
        d.setDate(today.getDate() + e.day + 1)
        return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
      })
    )
  }, [])

  const notes = tab === "crypto" ? CRYPTO_NOTES : FOREX_NOTES

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research"
        description="Notes from the trading desk — what we're watching, where the levels are, and the events that tend to move them."
        actions={<Badge tone="neutral">Updated weekly</Badge>}
      />

      {/* Weekly outlook */}
      <Card className="p-5 sm:p-6 animate-fade-up">
        <CardHeader
          title="This week's outlook"
          description="A short read on how the book is positioned."
          action={<Badge tone="brand">Desk note</Badge>}
        />
        <div className="mt-4 space-y-3 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">
          <p>
            Crypto is consolidating rather than trending. Bitcoin has spent the week inside a tight range and,
            until it resolves, we are trading the edges of that range in smaller size instead of chasing
            breakouts that keep failing. Ethereum and Solana are the preferred expressions if the range breaks
            upward, because both have been leading on strength.
          </p>
          <p>
            In FX the dollar remains firm and the desk is short EUR into resistance while that holds. USD/JPY is
            the cleanest trend on the board but carries intervention risk, so it runs at reduced size. Gold is
            held as ballast against the crypto book.
          </p>
          <p>
            Two high-impact prints land midweek. Positions are reduced or closed ahead of them — we would rather
            re-enter after the move than hold through a print that can gap straight through a stop.
          </p>
        </div>
      </Card>

      <Tabs
        items={[
          { value: "crypto" as const, label: "Crypto" },
          { value: "forex" as const, label: "Forex" },
          { value: "calendar" as const, label: "Calendar" },
        ]}
        value={tab}
        onChange={setTab}
        className="tabs-fill-mobile animate-fade-up"
      />

      {tab === "calendar" ? (
        <Card className="overflow-hidden animate-fade-up">
          <CardHeader
            className="p-5 sm:p-6"
            title="Upcoming events"
            description="Scheduled releases the desk trades around."
            action={<IconCalendarEvent className="h-5 w-5 text-less" stroke={1.8} />}
          />
          <div className="divide-y divide-[var(--background-hover)] border-t border-border">
            {EVENTS.map((e, i) => (
              <div key={`${e.title}-${i}`} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <div className="w-[104px] flex-shrink-0 sm:w-[132px]">
                  <div className="text-[12px] font-medium text-foreground">{dates ? dates[i] : "—"}</div>
                  <div className="text-[12px] leading-[18px] text-less">{e.time}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] text-foreground">{e.title}</div>
                  <div className="truncate text-[12px] leading-[18px] text-less">{e.region}</div>
                </div>
                <Badge tone={e.impact === "high" ? "danger" : "warning"}>
                  {e.impact === "high" ? "High impact" : "Medium"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6 animate-fade-up">
          <CardHeader
            title={tab === "crypto" ? "Crypto notes" : "Forex notes"}
            description="Bias is the desk's current read, not a guarantee — it changes when the level does."
          />
          <div className="mt-2 divide-y divide-[var(--background-hover)]">
            {notes.map((n) => (
              <NoteRow key={n.symbol} note={n} />
            ))}
          </div>
        </Card>
      )}

      <Card className="flex items-start gap-3 p-5 animate-fade-up sm:p-6">
        <IconAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" stroke={1.8} />
        <div className="min-w-0 text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">
          <p className="font-bold text-foreground">This is commentary, not advice.</p>
          <p className="mt-1">
            Levels and bias reflect how the desk is positioned at the time of writing and can change without
            notice. Nothing here is a forecast or a promise of a return, and trading carries the risk of loss.
          </p>
        </div>
      </Card>
    </div>
  )
}
