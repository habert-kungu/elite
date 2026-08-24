import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { MIN_DEPOSIT_USD, SELECTABLE_PLANS, formatPlanAmount, planCurrency, planFor, poolLabel as planName } from "@/lib/trading"

/**
 * Transactional email. Configured entirely through env:
 *
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE ("true" for 465)
 *   MAIL_FROM   e.g. "Elite Forex Hub <no-reply@example.com>"
 *   APP_URL     public origin used in links, e.g. https://eliteforexhub.com
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
export const PRODUCTION_URL = "https://eliteforexhub.com"

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
// ---------------------------------------------------------------------------

const BRAND = {
  // Deriv Design System (zeroheight.com/36313d3c8): Coral red brand, Dark gray
  // ink, system light greys, light-theme status colours.
  red: "#FDE68A",
  onBrand: "#0E0E0E",
  ink: "#0E0E0E",
  text: "#333333",
  muted: "#999999",
  line: "#E6E9E9",
  panel: "#F2F3F4",
  bg: "#F2F3F4",
  green: "#C28B00",
  amber: "#FFAD3A",
}
const SUPPORT_TELEGRAM = "https://t.me/khan_bashiri"
const FONT = "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

function escape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function money(n: number, digits = 0): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

function greeting(name?: string | null): string {
  return `<p style="margin:0 0 14px">${name ? `Hi ${escape(name)},` : "Hello,"}</p>`
}

function p(html: string): string {
  return `<p style="margin:0 0 14px">${html}</p>`
}

/** Label/value rows in a soft panel — for amounts, references, credentials. */
function details(rows: [string, string][]): string {
  const tr = rows
    .map(
      ([k, v], i) => `<tr>
  <td style="padding:10px 16px;font-size:13px;color:${BRAND.muted};border-top:${i ? `1px solid ${BRAND.line}` : "0"};white-space:nowrap">${escape(k)}</td>
  <td align="right" style="padding:10px 16px;font-size:14px;font-weight:600;color:${BRAND.ink};border-top:${i ? `1px solid ${BRAND.line}` : "0"};word-break:break-word">${v}</td>
</tr>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:10px;border-collapse:separate;overflow:hidden">${tr}</table>`
}

/** Monospace credential/reference block. */
function code(v: string): string {
  return `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px">${escape(v)}</span>`
}

function note(html: string, tone: "info" | "warn" = "info"): string {
  const color = tone === "warn" ? BRAND.amber : BRAND.muted
  const bg = tone === "warn" ? "#FFF4E0" : BRAND.panel
  return `<p style="margin:18px 0 0;padding:12px 14px;background:${bg};border-left:3px solid ${color};border-radius:6px;font-size:13px;line-height:1.55;color:${BRAND.text}">${html}</p>`
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 6px"><tr><td style="border-radius:4px;background:${BRAND.red}">
  <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.onBrand};text-decoration:none;border-radius:4px">${escape(label)}</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};word-break:break-all">If the button doesn't work, copy this link: <a href="${href}" style="color:${BRAND.muted}">${href}</a></p>`
}

/** Shared shell: hidden preheader, dark header band, white card, muted footer. */
function layout(title: string, body: string, preheader?: string): string {
  const site = appUrl()
  const host = site.replace(/^https?:\/\//, "")
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${FONT};color:${BRAND.text};-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
    <tr><td style="background:${BRAND.ink};border-radius:16px 16px 0 0;line-height:0;font-size:0">
      <!-- Image banner. The dark cell, the alt text and the wordmark fallback
           row below keep the header branded when images are blocked. -->
      <a href="${site}" style="display:block;line-height:0">
        <img src="${appUrl("/images/email-banner.png")}" width="560" height="140" alt="${escape(APP_NAME)}" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:16px 16px 0 0" />
      </a>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${BRAND.line};border-top:0;border-radius:0 0 16px 16px;padding:32px 32px 28px">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink}">${escape(title)}</h1>
      <div style="font-size:15px;line-height:1.65;color:${BRAND.text}">${body}</div>
    </td></tr>
    <tr><td style="padding:22px 12px 0;text-align:center;font-size:12px;line-height:1.7;color:${BRAND.muted}">
      <a href="${site}" style="color:${BRAND.muted};text-decoration:none;font-weight:600">${escape(host)}</a>
      &nbsp;·&nbsp; <a href="${SUPPORT_TELEGRAM}" style="color:${BRAND.muted}">Support on Telegram</a><br/>
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
${p(`Your ${APP_NAME} account is ready. Choose a plan, and our desk handles the trading — you track every cycle live from your dashboard.`)}
${details([
  ...SELECTABLE_PLANS.map(
    (plan) =>
      [
        plan.name,
        `Invest ${formatPlanAmount(plan.tiers[0]!.invest, plan.key)} → earn ${formatPlanAmount(plan.tiers[0]!.earn, plan.key)} · ${planDuration(plan.key)}`,
      ] as [string, string]
  ),
  ["Minimum deposit", `${formatPlanAmount(MIN_DEPOSIT_USD, "daily")} in USDT (TRC20) — the Premium plan is funded in BTC`],
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
${button(link, "Choose a new password")}
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
${button(link, "Set my password")}
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
${button(link, "Choose a new password")}
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
<p style="margin:18px 0;text-align:center"><span style="display:inline-block;padding:14px 26px;background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:0.35em;color:${BRAND.ink}">${code}</span></p>
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
  ["Status", `<span style="color:${BRAND.red}">Not confirmed</span>`],
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
${note("Withdrawals are processed in USDT (TRC20). A 16.5% processing fee applies at withdrawal.")}`,
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

/** Turns admin-written plain text into safe, paragraphed HTML (blank line = new paragraph). */
