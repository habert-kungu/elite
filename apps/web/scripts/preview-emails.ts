/**
 * Renders every email template with sample data to HTML files for review.
 *   npx tsx scripts/preview-emails.ts [outDir]   (default: .email-previews/)
 */
import "dotenv/config"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

async function main() {
  const out = process.argv[2] || ".email-previews"
  mkdirSync(out, { recursive: true })
  if (!process.env.APP_URL && !process.env.DOMAIN) process.env.APP_URL = "https://alphareserve.net"
  const { sampleTemplates } = await import("../lib/mail")
  const index: string[] = []
  for (const t of sampleTemplates()) {
    writeFileSync(join(out, `${t.key}.html`), t.message.html)
    index.push(`<li><a href="${t.key}.html">${t.label}</a> — <code>${t.message.subject}</code></li>`)
  }
  writeFileSync(join(out, "index.html"), `<h1>AlphaReserve email templates</h1><ul>${index.join("")}</ul>`)
  console.log(`Wrote ${index.length} templates to ${out}/`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
