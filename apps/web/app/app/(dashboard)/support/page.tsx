"use client"

import * as React from "react"
import { Badge, Button, Card, CardHeader, Notice, Select, TextArea, TextField } from "@/components/ui"
import { PageHeader } from "@/app/components/page-header"
import { IconBrandTelegram, IconChevronDown, IconCircleCheck, IconMail } from "@tabler/icons-react"

const FAQS = [
  {
    q: "How do I start investing?",
    a: "Create an account, choose a plan (Daily 24h, Pro 5 days, 8 days or Premium 12 days in BTC), and contact us via Telegram to initiate your investment.",
  },
  {
    q: "What is the minimum investment?",
    a: "It depends on the plan: $300 on Daily, $1,000 on Pro, $10,000 on the 8 days plan, and ₿1 on Premium.",
  },
  {
    q: "How are returns calculated?",
    a: "Every plan has a fixed payout table — e.g. $300 → $3,000 on Daily, $1,000 → $15,000 on Pro, $10,000 → $150,000 on the 8 days plan and ₿1 → ₿5 on Premium. No trading experience needed.",
  },
  {
    q: "When do I receive returns?",
    a: "At the end of the plan: 24 hours on Daily, 5 days on Pro, 8 days on the 8 days plan and 12 days on Premium.",
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

const SUPPORT_EMAIL = "support@nextlevel.com"
const TELEGRAM_URL = "https://t.me/Patrickfxsignalelite"

const TOPICS = ["Deposits", "Withdrawals", "Account & security", "Plans & returns", "Something else"]

/** Deriv Accordion row: 16px radius card, Sub 2 bold question, chevron, P2 answer. */
function FaqRow({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-hover"
      >
        <span className="text-[16px] font-bold leading-6 text-foreground">{q}</span>
        <IconChevronDown className={`h-4 w-4 flex-shrink-0 text-less transition-transform ${open ? "rotate-180" : ""}`} stroke={2} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-[12px] leading-[18px] text-general md:text-[14px] md:leading-5">{a}</p>
        </div>
      )}
    </Card>
  )
}

export default function SupportPage() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  // Contact form: composes an email to the support address in the visitor's
  // own mail client. There is no server endpoint for this form.
  const [contact, setContact] = React.useState({ topic: TOPICS[0]!, subject: "", message: "" })
  const [sent, setSent] = React.useState(false)

  const sendContact = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`[${contact.topic}] ${contact.subject}`)
    const body = encodeURIComponent(contact.message)
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Help centre" description="Answers to common questions, and a direct line to the team when you need one." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* FAQ */}
        <div className="space-y-3 lg:col-span-3">
          <h2 className="text-[16px] font-bold leading-6 text-foreground">Frequently asked questions</h2>
          {FAQS.map((faq, i) => (
            <FaqRow key={i} q={faq.q} a={faq.a} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
          ))}
        </div>

        {/* Contact */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <CardHeader title="Contact us" description="Pick the fastest channel, or send us a message below." />
            <div className="mt-4 space-y-2">
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[8px] bg-background p-3 transition-colors hover:bg-hover">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <IconBrandTelegram className="h-4 w-4" stroke={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-foreground">Telegram</div>
                  <div className="text-[12px] leading-[18px] text-less">Chat with us directly</div>
                </div>
                <Badge tone="success" dot>~5 min</Badge>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 rounded-[8px] bg-background p-3 transition-colors hover:bg-hover">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-hover text-less">
                  <IconMail className="h-4 w-4" stroke={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-foreground">Email</div>
                  <div className="truncate text-[12px] leading-[18px] text-less">{SUPPORT_EMAIL}</div>
                </div>
                <Badge tone="neutral">~24 h</Badge>
              </a>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader title="Send a message" description="We reply by email within 24 hours." />
            {sent && (
              <div className="mt-4">
                <Notice tone="success" icon={<IconCircleCheck className="h-4 w-4" stroke={1.8} />}>
                  Your email app should have opened with the message ready to send. If it didn't, write to {SUPPORT_EMAIL} directly.
                </Notice>
              </div>
            )}
            <form onSubmit={sendContact} className="mt-5 space-y-4">
              <Select label="Topic" name="topic" value={contact.topic} onChange={(e) => setContact({ ...contact, topic: e.target.value })}>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <TextField label="Subject" name="subject" value={contact.subject} onChange={(e) => setContact({ ...contact, subject: e.target.value })} required maxLength={120} placeholder="Short summary" />
              <TextArea label="Message" name="message" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} required rows={5} placeholder="Tell us what's going on, including any transaction IDs." />
              <div className="flex justify-end">
                <Button type="submit">Send message</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
