/**
 * Verifies outbound email end-to-end.
 *
 *   npx tsx scripts/send-test-email.ts you@example.com      # uses SMTP_* from .env
 *   npx tsx scripts/send-test-email.ts --ethereal           # no config needed: sends to a
 *                                                           # throwaway Ethereal inbox and
 *                                                           # prints preview URLs
 */
import "dotenv/config"
import nodemailer from "nodemailer"

const args = process.argv.slice(2)
const ethereal = args.includes("--ethereal")
const to = args.find((a) => a.includes("@"))

async function main() {
  if (ethereal) {
    const acct = await nodemailer.createTestAccount()
    process.env.SMTP_HOST = acct.smtp.host
    process.env.SMTP_PORT = String(acct.smtp.port)
    process.env.SMTP_SECURE = String(acct.smtp.secure)
    process.env.SMTP_USER = acct.user
    process.env.SMTP_PASS = acct.pass
    process.env.MAIL_FROM = `Elite Forex Hub <${acct.user}>`
    console.log(`Ethereal inbox: ${acct.user} (https://ethereal.email/login — pass: ${acct.pass})`)
  } else if (!process.env.SMTP_HOST) {
    console.error("SMTP_HOST is not set. Configure SMTP_* in .env, or run with --ethereal for a dry run.")
    process.exit(1)
  } else if (!to) {
    console.error("Usage: npx tsx scripts/send-test-email.ts you@example.com")
    process.exit(1)
  }

  // Real sends must never carry localhost links.
  if (!ethereal && !process.env.APP_URL && !process.env.DOMAIN) {
    process.env.APP_URL = "https://elitequest.net"
    console.log("APP_URL not set — using https://elitequest.net for links")
  }

  // Import after env is set so the transport picks it up.
  const mail = await import("../lib/mail")
  const recipient = to ?? process.env.SMTP_USER!

  const verify = await mail.verifyMailTransport()
  console.log("SMTP connection:", verify.ok ? "OK" : `FAILED — ${verify.error}`)
  if (!verify.ok) process.exit(1)

  const results = [
    ["test", await mail.testEmail(recipient)],
    ["welcome", await mail.welcomeEmail(recipient, "Test User")],
    ["password-reset", await mail.passwordResetEmail(recipient, "example-token", "Test User")],
    ["password-reset-by-admin", await mail.passwordResetByAdminEmail(recipient, mail.appUrl("/reset-password?token=example-token"), "Test User")],
    ["deposit-received", await mail.depositReceivedEmail(recipient, { amount: 500, pool: "weekly", txHash: "0xabc123…", investmentId: "example-id", roi: 8, name: "Test User" })],
    ["deposit-approved", await mail.investmentDecisionEmail(recipient, { approved: true, amount: 500, pool: "weekly", targetValue: 4000, name: "Test User" })],
  ] as const

  for (const [name, r] of results) {
    console.log(`${r.sent ? "✓" : "✗"} ${name}${r.error ? ` — ${r.error}` : ""}${r.previewUrl ? `  →  ${r.previewUrl}` : ""}`)
  }
  process.exit(results.every(([, r]) => r.sent) ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
