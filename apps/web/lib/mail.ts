import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { MIN_DEPOSIT_USD, SELECTABLE_PLANS, formatPlanAmount, planCurrency, planFor, poolLabel as planName } from "@/lib/trading"

/**
 * Transactional email. Configured entirely through env:
 *
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE ("true" for 465)
 *   MAIL_FROM   e.g. "Elite Forex Hub <no-reply@example.com>"
 *   APP_URL     public origin used in links, e.g. https://elitequest.net
 *   ADMIN_EMAIL optional — receives admin notices (new deposit requests)
 *
 * When SMTP_HOST is unset (local dev) nothing is sent; the message is logged
 * to the server console instead so flows can still be exercised end-to-end.
 */

const APP_NAME = "Elite Forex Hub"

export function isMailConfigured(): boolean {
  return !!process.env.SMTP_HOST
}

/** Public site origin for links in emails. */
export const PRODUCTION_URL = "https://elitequest.net"

export function appUrl(path = ""): string {
  const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  const fromDomain = process.env.DOMAIN ? `https://${process.env.DOMAIN.replace(/^https?:\/\//, "")}` : undefined
  // Never let a real email point at localhost: only fall back to it when we're
  // clearly in local development (no config at all, not production).
  const base = (explicit || fromDomain || (process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000")).replace(/\/$/, "")
  return `${base}${path}`
}

let cached: Transporter | null = null
function getTransport(): Transporter {
  if (cached) return cached
  const port = Number(process.env.SMTP_PORT || 587)
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  return cached
}

export interface MailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

/** Never throws — email failures must not break the request that triggered them. */
export async function sendMail(msg: MailMessage): Promise<{ sent: boolean; error?: string; previewUrl?: string }> {
  const from = process.env.MAIL_FROM || `${APP_NAME} <no-reply@${appUrl().replace(/^https?:\/\//, "")}>`
  if (!isMailConfigured()) {
    console.log(
      `\n📧 [mail:dev] To: ${msg.to}\n   Subject: ${msg.subject}\n   ${(msg.text || stripHtml(msg.html)).replace(/\n/g, "\n   ")}\n`
    )
    return { sent: false, error: "SMTP not configured" }
  }
  try {
    const info = await getTransport().sendMail({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text || stripHtml(msg.html) })
    // Only set for Ethereal test accounts (used by scripts/send-test-email.ts).
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined
    return { sent: true, previewUrl }
  } catch (error) {
    console.error("sendMail failed:", error)
    return { sent: false, error: error instanceof Error ? error.message : "send failed" }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ---------------------------------------------------------------------------
// Design system
//
// Deliberately plain. A transactional email should read like a note from the
// desk, not a landing page: one accent colour, hairline rules instead of
// nested panels, and a text wordmark that renders even when images are
// blocked — which, by default, they are in most inboxes.
// ---------------------------------------------------------------------------

const BRAND = {
  // Elite palette, tuned for white paper: the pale brand yellow only ever
  // carries dark text on top of it, never sits as text on white.
  yellow: "#FDE68A",
  onBrand: "#0E0E0E",
  accent: "#E0A800",
  ink: "#111111",
  text: "#3C3C3C",
  muted: "#8A8A8A",
  line: "#E8E8EA",
  panel: "#FAFAFA",
  bg: "#F6F6F7",
  green: "#8A6600",
  danger: "#C62B37",
}
const SUPPORT_TELEGRAM = "https://t.me/Patrick_vile"
const FONT = "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

function escape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function money(n: number, digits = 0): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

function greeting(name?: string | null): string {
  return `<p style="margin:0 0 16px">${name ? `Hi ${escape(name)},` : "Hello,"}</p>`
}

function p(html: string): string {
  return `<p style="margin:0 0 16px">${html}</p>`
}

/** Label/value rows separated by hairlines — no box, no fill. */
function details(rows: [string, string][]): string {
  const tr = rows
    .map(
      ([k, v]) => `<tr>
  <td style="padding:11px 0;font-size:13px;line-height:1.45;color:${BRAND.muted};border-top:1px solid ${BRAND.line};white-space:nowrap;vertical-align:top">${escape(k)}</td>
  <td align="right" style="padding:11px 0 11px 24px;font-size:14px;line-height:1.45;color:${BRAND.ink};border-top:1px solid ${BRAND.line};word-break:break-word;vertical-align:top">${v}</td>
</tr>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 6px;border-collapse:collapse">${tr}
<tr><td colspan="2" style="border-top:1px solid ${BRAND.line};font-size:0;line-height:0">&#8203;</td></tr></table>`
}

/** Monospace credential/reference value. */
function code(v: string): string {
  return `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px">${escape(v)}</span>`
}

/**
 * A closing aside. Informational notes are just quiet text — boxing every
 * sentence is what made these feel busy. Only warnings get a tint.
 */
function note(html: string, tone: "info" | "warn" = "info"): string {
  if (tone === "warn") {
    return `<p style="margin:22px 0 0;padding:12px 14px;background:#FFF7E8;border-radius:8px;font-size:13px;line-height:1.6;color:${BRAND.text}">${html}</p>`
  }
  return `<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted}">${html}</p>`
}

/**
 * Primary action. `fallback` adds the copy-paste URL line — worth the clutter
 * for one-time links that are useless if the button doesn't render, and not
 * worth it for links to pages the reader can reach anyway.
 */
function button(href: string, label: string, opts: { fallback?: boolean } = {}): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 0"><tr><td style="border-radius:6px;background:${BRAND.yellow}">
  <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.onBrand};text-decoration:none">${escape(label)}</a>
</td></tr></table>${
    opts.fallback
      ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};word-break:break-all">Or paste this into your browser:<br/><a href="${href}" style="color:${BRAND.muted}">${href}</a></p>`
      : ""
  }`
}

/** Shared shell: hidden preheader, wordmark, one white card, quiet footer. */
function layout(title: string, body: string, preheader?: string): string {
  const site = appUrl()
  const host = site.replace(/^https?:\/\//, "")
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${escape(title)}</title>
<style>@media only screen and (max-width:600px){.card{padding:26px 22px 24px!important}h1.subject{font-size:19px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${FONT};color:${BRAND.text};-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:40px 16px 44px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
    <tr><td style="padding:0 2px 14px">
      <a href="${site}" style="font-family:${FONT};font-size:19px;font-weight:600;letter-spacing:-0.015em;color:${BRAND.ink};text-decoration:none">elite<span style="color:${BRAND.accent}">.</span></a>
    </td></tr>
    <tr><td class="card" style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:12px;padding:36px 36px 32px">
      <h1 class="subject" style="margin:0 0 14px;font-size:20px;line-height:1.35;font-weight:600;letter-spacing:-0.01em;color:${BRAND.ink}">${escape(title)}</h1>
      <div style="font-size:15px;line-height:1.62;color:${BRAND.text}">${body}</div>
    </td></tr>
    <tr><td style="padding:20px 2px 0;font-size:12px;line-height:1.7;color:${BRAND.muted}">
      <a href="${site}" style="color:${BRAND.muted};text-decoration:none">${escape(host)}</a>
      &nbsp;·&nbsp;<a href="${SUPPORT_TELEGRAM}" style="color:${BRAND.muted};text-decoration:none">Telegram</a><br/>
      You're receiving this because you have an ${APP_NAME} account. Trading involves risk — never invest more than you can afford to lose.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

/** Full plan name for a stored pool key ("Pro 5 days"). */
function poolLabel(pool: string) {
  return planName(pool)
}

/** Amount in the plan's own currency — "$2,000" for USD plans, "₿1.5" for the BTC plan. */
function planMoney(n: number, pool: string): string {
  const rounded = planCurrency(pool) === "BTC" ? Math.round(n * 1e6) / 1e6 : Math.round(n)
  return formatPlanAmount(rounded, pool)
}

/** "24 hours" / "5 days" */
function planDuration(pool: string): string {
  const d = planFor(pool).durationDays
  return d === 1 ? "24 hours" : `${d} days`
}

/** When the payout lands: "within 24 hours" / "after 5 days". */
function profitsPaid(pool: string): string {
  const d = planFor(pool).durationDays
  return d === 1 ? "within 24 hours" : `after ${d} days`
}

// ---------------------------------------------------------------------------
// Templates — builders (previewable) + send wrappers
// ---------------------------------------------------------------------------

export const buildWelcome = (to: string, name?: string | null): MailMessage => ({
  to,
  subject: `Welcome to ${APP_NAME}`,
  html: layout(
    "Welcome aboard",
    `${greeting(name)}
${p(`Your ${APP_NAME} account is ready. Choose a plan, and our desk handles the trading — you track every cycle live from your dashboard. Plans are funded in USDT, except Premium 12 days which takes BTC.`)}
${details([
  ...SELECTABLE_PLANS.map(
    (plan) =>
      [
        plan.name,
        `Invest ${formatPlanAmount(plan.tiers[0]!.invest, plan.key)} → earn ${formatPlanAmount(plan.tiers[0]!.earn, plan.key)} · ${planDuration(plan.key)}`,
      ] as [string, string]
  ),
  ["Minimum deposit", `${formatPlanAmount(MIN_DEPOSIT_USD, "daily")} in USDT (TRC20)`],
])}
${button(appUrl("/app/investments"), "Make your first deposit")}
${note("Questions before you start? Reply to this email or message the desk on Telegram — a real person answers.")}`,
    "Your account is ready. Choose a plan and track every cycle live."
  ),
})

export const buildPasswordReset = (to: string, token: string, name?: string | null): MailMessage => {
  const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`)
  return {
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: layout(
      "Reset your password",
      `${greeting(name)}
${p("We received a request to reset the password on this account. Use the button below to choose a new one.")}
${details([
  ["Link valid for", "1 hour"],
  ["Can be used", "once"],
])}
${button(link, "Choose a new password", { fallback: true })}
${note("Didn't request this? You can ignore this email — your password stays the same and nobody else can use this link.")}`,
      "Use this link within 1 hour to choose a new password."
    ),
  }
}

export const buildPasswordChanged = (to: string, name?: string | null): MailMessage => ({
  to,
  subject: `Your ${APP_NAME} password was changed`,
  html: layout(
    "Password changed",
    `${greeting(name)}
${p("The password on your account was just changed, and every other device has been signed out.")}
${p("If this was you, there's nothing else to do.")}
${note("If you <strong>didn't</strong> make this change, reset your password right away and contact support so we can secure the account.", "warn")}
${button(appUrl("/forgot-password"), "Secure my account")}`,
    "Your password was changed and other devices were signed out."
  ),
})

export const buildAccountCreatedByAdmin = (to: string, link: string, name?: string | null): MailMessage => ({
  to,
  subject: `Activate your ${APP_NAME} account`,
  html: layout(
    "Your account is ready",
    `${greeting(name)}
${p(`An ${APP_NAME} account has been created for you. Choose your password to activate it — the link below is personal to you.`)}
${details([
  ["Email", code(to)],
  ["Link valid for", "72 hours"],
])}
${button(link, "Set my password", { fallback: true })}
${note("Keep this email private: anyone with the link can set the password until it's used or expires.")}`,
    `Choose your password to activate your ${APP_NAME} account.`
  ),
})

export const buildPasswordResetByAdmin = (to: string, link: string, name?: string | null): MailMessage => ({
  to,
  subject: `Set a new ${APP_NAME} password`,
  html: layout(
    "Set a new password",
    `${greeting(name)}
${p("An administrator reset the password on your account and signed you out of every device. Use the link below to choose a new password — nobody, including our team, can see it.")}
${details([
  ["Email", code(to)],
  ["Link valid for", "24 hours"],
  ["Can be used", "once"],
])}
${button(link, "Choose a new password", { fallback: true })}
${note("If you weren't expecting this, contact support before using the link.", "warn")}`,
    "An administrator reset your password. Choose a new one with this link."
  ),
})

export const buildLoginCode = (to: string, code: string, opts: { purpose: "login" | "enable"; name?: string | null }): MailMessage => {
  const enabling = opts.purpose === "enable"
  return {
    to,
    subject: enabling ? `${code} is your ${APP_NAME} verification code` : `${code} is your ${APP_NAME} sign-in code`,
    html: layout(
      enabling ? "Confirm two-step verification" : "Your sign-in code",
      `${greeting(opts.name)}
${p(enabling ? "Enter this code to turn on two-step verification for your account." : `Someone — hopefully you — is signing in to your ${APP_NAME} account. Enter this code to continue.`)}
<p style="margin:24px 0 4px;text-align:center"><span style="display:inline-block;padding:16px 24px 16px 30px;background:${BRAND.panel};border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;line-height:1;font-weight:600;letter-spacing:0.3em;color:${BRAND.ink}">${code}</span></p>
${details([
  ["Valid for", "10 minutes"],
  ["Can be used", "once"],
])}
${note(enabling ? "Didn't start this? You can ignore this email — nothing changes without the code." : "If this wasn't you, your password may be known to someone else. Change it from Account settings → Security as soon as you can.", enabling ? "info" : "warn")}`,
      `${code} — your ${APP_NAME} ${enabling ? "verification" : "sign-in"} code, valid 10 minutes.`
    ),
  }
}

export const buildTwoFactorChanged = (to: string, enabled: boolean, name?: string | null): MailMessage => ({
  to,
  subject: enabled ? "Two-step verification is on" : "Two-step verification was turned off",
  html: layout(
    enabled ? "Two-step verification is on" : "Two-step verification turned off",
    `${greeting(name)}
${p(enabled ? "From now on, signing in to your account needs your password <strong>and</strong> a code we email you." : "Signing in to your account now only needs your password.")}
${note(enabled ? "Keep access to this inbox — it's where your sign-in codes arrive." : "If you didn't turn this off, change your password and turn two-step verification back on from Account settings → Security.", enabled ? "info" : "warn")}
${button(appUrl("/app/profile"), "Security settings")}`,
    enabled ? "Two-step verification is now on for your account." : "Two-step verification was turned off for your account."
  ),
})

export const buildDepositReceived = (
  to: string,
  opts: { amount: number; pool: string; txHash: string; investmentId: string; roi: number; network?: string; name?: string | null }
): MailMessage => ({
  to,
  subject: `Deposit received — ${planMoney(opts.amount, opts.pool)} ${poolLabel(opts.pool)} (pending review)`,
  html: layout(
    "We've received your deposit request",
    `${greeting(opts.name)}
${p(`Your <strong>${poolLabel(opts.pool)}</strong> deposit has been submitted and is <strong>pending review</strong>. We match the transaction on-chain and activate your cycle — usually within the hour during trading sessions.`)}
${details([
  ["Amount", planMoney(opts.amount, opts.pool)],
  ["Plan", `${poolLabel(opts.pool)} · ${opts.roi}x`],
  ["Target return", planMoney(opts.amount * opts.roi, opts.pool)],
  ["Network", escape(opts.network || "USDT (TRC20)")],
  ["Transaction", code(opts.txHash)],
  ["Reference", code(opts.investmentId)],
])}
${button(appUrl("/app/transactions"), "View status")}
${note("You'll get another email the moment it's confirmed. Nothing else is needed from you.")}`,
    `${planMoney(opts.amount, opts.pool)} ${poolLabel(opts.pool)} deposit received — pending review.`
  ),
})

export const buildInvestmentDecision = (
  to: string,
  opts: { approved: boolean; amount: number; pool: string; targetValue?: number; name?: string | null }
): MailMessage => {
  const plan = poolLabel(opts.pool)
  const amount = planMoney(opts.amount, opts.pool)
  return opts.approved
    ? {
        to,
        subject: `Deposit confirmed — ${amount} ${plan} is now active`,
        html: layout(
          "Your deposit is confirmed",
          `${greeting(opts.name)}
${p(`Your <strong>${plan}</strong> deposit has been confirmed and your cycle is now <strong style="color:${BRAND.green}">active</strong>. You can follow it live on your dashboard.`)}
${details([
  ["Amount", amount],
  ["Plan", plan],
  ...(opts.targetValue ? [["Target return", planMoney(opts.targetValue, opts.pool)] as [string, string]] : []),
  ["Profits paid", profitsPaid(opts.pool)],
])}
${button(appUrl("/app"), "Track your cycle")}`,
          `${amount} ${plan} confirmed — your cycle is active.`
        ),
      }
    : {
        to,
        subject: `Deposit not confirmed — ${amount} ${plan}`,
        html: layout(
          "We couldn't confirm your deposit",
          `${greeting(opts.name)}
${p(`We weren't able to match your <strong>${plan}</strong> deposit of <strong>${amount}</strong> to an incoming transfer. This usually means the transaction hash didn't match, or the funds were sent on a different network.`)}
${details([
  ["Amount", amount],
  ["Plan", plan],
  ["Status", `<span style="color:${BRAND.danger}">Not confirmed</span>`],
])}
${p("If you believe this is a mistake, reply with your transaction hash and network and we'll take another look.")}
${button(appUrl("/app/support"), "Contact support")}`,
          `We couldn't confirm your ${amount} ${plan} deposit.`
        ),
      }
}

export const buildCycleCompleted = (to: string, opts: { amount: number; pool: string; returnAmount: number; name?: string | null }): MailMessage => ({
  to,
  subject: `Cycle complete — ${planMoney(opts.returnAmount, opts.pool)} is ready`,
  html: layout(
    "Your cycle is complete",
    `${greeting(opts.name)}
${p(`Your <strong>${poolLabel(opts.pool)}</strong> cycle has completed. Your return is available on your dashboard now.`)}
${details([
  ["Deposited", planMoney(opts.amount, opts.pool)],
  ["Return", `<span style="color:${BRAND.green}">${planMoney(opts.returnAmount, opts.pool)}</span>`],
  ["Profit", `<span style="color:${BRAND.green}">+${planMoney(opts.returnAmount - opts.amount, opts.pool)}</span>`],
])}
${button(appUrl("/app/withdraw"), "Withdraw")}
${note("Withdrawals are processed in USDT (TRC20) and paid in full. A 16.5% tax is deposited separately before a withdrawal is released — it is never deducted from your payout.")}`,
    `${planMoney(opts.returnAmount, opts.pool)} is ready on your dashboard.`
  ),
})

type NewDepositAdminOpts = {
  userEmail: string
  userName?: string | null
  amount: number
  pool: string
  txHash: string
  investmentId: string
  network?: string
}

/** The admin notice itself, addressed explicitly — used by the preview too. */
export const newDepositAdminMessage = (to: string, opts: NewDepositAdminOpts): MailMessage => {
  return {
    to,
    subject: `New deposit — ${planMoney(opts.amount, opts.pool)} from ${opts.userName || opts.userEmail}`,
    html: layout(
      "New deposit request",
      `${p(`<strong>${escape(opts.userName || opts.userEmail)}</strong> (${escape(opts.userEmail)}) submitted a deposit that needs your review.`)}
${details([
  ["Amount", planMoney(opts.amount, opts.pool)],
  ["Plan", `${poolLabel(opts.pool)} · ${planDuration(opts.pool)}`],
  ["Network", escape(opts.network || "TRC20")],
  ["Transaction", code(opts.txHash)],
  ["Reference", code(opts.investmentId)],
])}
${button(appUrl("/app/admin/deposits"), "Review in admin panel")}`,
      `${planMoney(opts.amount, opts.pool)} ${poolLabel(opts.pool)} from ${opts.userName || opts.userEmail} — needs review.`
    ),
  }
}

/** Sends only when ADMIN_EMAIL is configured. */
export const buildNewDepositAdmin = (opts: NewDepositAdminOpts): MailMessage | null => {
  const to = process.env.ADMIN_EMAIL
  return to ? newDepositAdminMessage(to, opts) : null
}

export const buildWithdrawalRequested = (
  to: string,
  opts: { amount: number; tax: number; network: string; address: string; name?: string | null }
): MailMessage => ({
  to,
  subject: `Withdrawal requested — ${money(opts.amount)}`,
  html: layout(
    "Withdrawal requested",
    `${greeting(opts.name)}
${p("We've received your withdrawal request. You'll get another email once it has been paid out.")}
${details([
  ["Amount", money(opts.amount)],
  ["You receive", `<span style="color:${BRAND.green}">${money(opts.amount)}</span>`],
  ["Tax already deposited", money(opts.tax)],
  ["Network", escape(opts.network)],
  ["Address", code(opts.address)],
])}
${note("Withdrawals are paid in full — the tax you deposited is never taken off this amount. Payouts are processed within 24-48 hours.")}`,
    `Your ${money(opts.amount)} withdrawal request was received.`
  ),
})

export const buildWithdrawalSettled = (
  to: string,
  opts: { amount: number; approved: boolean; txHash?: string | null; name?: string | null }
): MailMessage => ({
  to,
  subject: opts.approved ? `Withdrawal paid — ${money(opts.amount)}` : `Withdrawal rejected — ${money(opts.amount)}`,
  html: layout(
    opts.approved ? "Withdrawal paid" : "Withdrawal rejected",
    `${greeting(opts.name)}
${p(
  opts.approved
    ? `Your withdrawal of <strong>${money(opts.amount)}</strong> has been sent to your wallet.`
    : `Your withdrawal of <strong>${money(opts.amount)}</strong> was not approved. The amount is available in your balance again.`
)}
${details(
  opts.approved && opts.txHash
    ? [["Amount", money(opts.amount)], ["Transaction", code(opts.txHash)]]
    : [["Amount", money(opts.amount)]]
)}
${button(appUrl("/app/transactions"), "View your transactions")}`,
    opts.approved ? `${money(opts.amount)} has been sent to your wallet.` : `Your ${money(opts.amount)} withdrawal was rejected.`
  ),
})

export const buildNewWithdrawalAdmin = (opts: {
  userEmail: string
  userName?: string | null
  amount: number
  tax: number
  network: string
  address: string
  withdrawalId: string
}): MailMessage | null => {
  const to = process.env.ADMIN_EMAIL
  if (!to) return null
  return {
    to,
    subject: `Withdrawal request — ${money(opts.amount)} from ${opts.userName || opts.userEmail}`,
    html: layout(
      "Withdrawal request",
      `${p(`<strong>${escape(opts.userName || opts.userEmail)}</strong> (${escape(opts.userEmail)}) requested a withdrawal. Confirm their tax deposit before paying it out.`)}
${details([
  ["Amount to pay", money(opts.amount)],
  ["Tax they deposited", money(opts.tax)],
  ["Network", escape(opts.network)],
  ["Address", code(opts.address)],
  ["Reference", code(opts.withdrawalId)],
])}
${button(appUrl("/app/admin/transactions?type=withdrawal"), "Review in admin panel")}`,
      `${money(opts.amount)} withdrawal from ${opts.userName || opts.userEmail} — needs review.`
    ),
  }
}

/** Turns admin-written plain text into safe, paragraphed HTML (blank line = new paragraph). */
function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => p(escape(para).replace(/\n/g, "<br/>")))
    .join("\n")
}

export const buildCustom = (to: string, opts: { subject: string; body: string; name?: string | null; ctaLabel?: string; ctaUrl?: string }): MailMessage => ({
  to,
  subject: opts.subject,
  html: layout(opts.subject, `${greeting(opts.name)}${textToHtml(opts.body)}${opts.ctaUrl && opts.ctaLabel ? button(opts.ctaUrl, opts.ctaLabel) : ""}`, opts.body.slice(0, 120)),
})

export const buildTest = (to: string): MailMessage => ({
  to,
  subject: `${APP_NAME} test email`,
  html: layout(
    "Email is working",
    `${p(`This is a test message from the ${APP_NAME} admin panel.`)}
${p("If you can read this, outbound email is configured correctly: investors will receive welcome emails, deposit updates, cycle completions and password resets.")}
${details([
  ["Sent from", escape(process.env.MAIL_FROM || `${APP_NAME} <no-reply@${appUrl().replace(/^https?:\/\//, "")}>`)],
  ["Links point to", escape(appUrl())],
])}
${button(appUrl("/app/admin/communications"), "Back to Communications")}`,
    `Outbound email from ${APP_NAME} is working.`
  ),
})

// Send wrappers (keep the existing call sites unchanged).
export const welcomeEmail = (to: string, name?: string | null) => sendMail(buildWelcome(to, name))
export const passwordResetEmail = (to: string, token: string, name?: string | null) => sendMail(buildPasswordReset(to, token, name))
export const passwordChangedEmail = (to: string, name?: string | null) => sendMail(buildPasswordChanged(to, name))
export const accountCreatedByAdminEmail = (to: string, link: string, name?: string | null) => sendMail(buildAccountCreatedByAdmin(to, link, name))
export const passwordResetByAdminEmail = (to: string, link: string, name?: string | null) => sendMail(buildPasswordResetByAdmin(to, link, name))
export const depositReceivedEmail = (to: string, opts: Parameters<typeof buildDepositReceived>[1]) => sendMail(buildDepositReceived(to, opts))
export const investmentDecisionEmail = (to: string, opts: Parameters<typeof buildInvestmentDecision>[1]) => sendMail(buildInvestmentDecision(to, opts))
export const cycleCompletedEmail = (to: string, opts: Parameters<typeof buildCycleCompleted>[1]) => sendMail(buildCycleCompleted(to, opts))
export function newDepositAdminEmail(opts: Parameters<typeof buildNewDepositAdmin>[0]) {
  const msg = buildNewDepositAdmin(opts)
  return msg ? sendMail(msg) : Promise.resolve({ sent: false, error: "ADMIN_EMAIL not set" })
}
export const withdrawalRequestedEmail = (to: string, opts: Parameters<typeof buildWithdrawalRequested>[1]) => sendMail(buildWithdrawalRequested(to, opts))
export const withdrawalSettledEmail = (to: string, opts: Parameters<typeof buildWithdrawalSettled>[1]) => sendMail(buildWithdrawalSettled(to, opts))
export function newWithdrawalAdminEmail(opts: Parameters<typeof buildNewWithdrawalAdmin>[0]) {
  const msg = buildNewWithdrawalAdmin(opts)
  return msg ? sendMail(msg) : Promise.resolve({ sent: false, error: "ADMIN_EMAIL not set" })
}
export const customEmail = (to: string, opts: Parameters<typeof buildCustom>[1]) => sendMail(buildCustom(to, opts))
export const loginCodeEmail = (to: string, code: string, opts: Parameters<typeof buildLoginCode>[2]) => sendMail(buildLoginCode(to, code, opts))
export const twoFactorChangedEmail = (to: string, enabled: boolean, name?: string | null) => sendMail(buildTwoFactorChanged(to, enabled, name))
export const testEmail = (to: string) => sendMail(buildTest(to))

/** Every template with sample data — used by the preview script and admin preview. */
export function sampleTemplates(): { key: string; label: string; message: MailMessage }[] {
  const to = "investor@example.com"
  const name = "Jane Doe"
  return [
    { key: "welcome", label: "Welcome", message: buildWelcome(to, name) },
    { key: "deposit-received", label: "Deposit received", message: buildDepositReceived(to, { amount: 2000, pool: "pro5", txHash: "7f3a9c…e41b", investmentId: "inv_8k2m4q", roi: 15, network: "USDT (TRC20)", name }) },
    { key: "deposit-confirmed", label: "Deposit confirmed", message: buildInvestmentDecision(to, { approved: true, amount: 2000, pool: "pro5", targetValue: 30000, name }) },
    { key: "deposit-rejected", label: "Deposit not confirmed", message: buildInvestmentDecision(to, { approved: false, amount: 500, pool: "daily", name }) },
    { key: "cycle-completed", label: "Cycle completed", message: buildCycleCompleted(to, { amount: 1, pool: "premium12", returnAmount: 5, name }) },
    { key: "login-code", label: "Sign-in code (two-step)", message: buildLoginCode(to, "482913", { purpose: "login", name }) },
    { key: "two-factor-on", label: "Two-step verification on", message: buildTwoFactorChanged(to, true, name) },
    { key: "password-reset", label: "Password reset link", message: buildPasswordReset(to, "sample-token", name) },
    { key: "password-changed", label: "Password changed", message: buildPasswordChanged(to, name) },
    { key: "account-created", label: "Account created by admin", message: buildAccountCreatedByAdmin(to, appUrl("/reset-password?token=sample-token&welcome=1"), name) },
    { key: "password-reset-admin", label: "Password reset by admin", message: buildPasswordResetByAdmin(to, appUrl("/reset-password?token=sample-token"), name) },
    { key: "admin-new-deposit", label: "New deposit (admin notice)", message: newDepositAdminMessage(process.env.ADMIN_EMAIL || "desk@example.com", { userEmail: to, userName: name, amount: 10000, pool: "plan8", txHash: "7f3a9c…e41b", investmentId: "inv_8k2m4q", network: "TRC20" }) },
    { key: "custom", label: "Admin message", message: buildCustom(to, { subject: "Pro 5 days closes Friday", body: "Entries for the next Pro 5 days cycle close this Friday at 18:00 UTC.\n\nDeposits confirmed before then are included in this cycle. Anything after rolls into the next one.", name, ctaLabel: "Open dashboard", ctaUrl: appUrl("/app") }) },
    { key: "test", label: "Test email", message: buildTest(to) },
  ]
}

export function mailStatus() {
  return {
    configured: isMailConfigured(),
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT || 587) === 465,
    from: process.env.MAIL_FROM || `${APP_NAME} <no-reply@${appUrl().replace(/^https?:\/\//, "")}>`,
    appUrl: appUrl(),
    adminEmail: process.env.ADMIN_EMAIL || null,
  }
}

/** Checks the SMTP connection/credentials without sending anything. */
export async function verifyMailTransport(): Promise<{ ok: boolean; error?: string }> {
  if (!isMailConfigured()) return { ok: false, error: "SMTP_HOST is not set" }
  try {
    await getTransport().verify()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "verify failed" }
  }
}
