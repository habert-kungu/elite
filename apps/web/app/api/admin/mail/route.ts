import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/auth"
import { mailStatus, verifyMailTransport, testEmail, customEmail } from "@/lib/mail"
import prisma from "@/lib/db"

/** GET: SMTP configuration + live connection check. */
export async function GET(request: NextRequest) {
  if (!(await getAdminUser(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const status = mailStatus()
  const verify = status.configured ? await verifyMailTransport() : { ok: false, error: "SMTP_HOST is not set — emails are logged to the server console instead of sent." }
  const [users, admins] = await Promise.all([prisma.user.count(), prisma.user.count({ where: { role: "admin" } })])
  return NextResponse.json({ ...status, connection: verify, audience: { all: users, admins, users: users - admins } })
}

const MAX_RECIPIENTS = 500

/**
 * POST { action: "test" }                                  → sends a test email to the signed-in admin
 * POST { action: "send", to, subject, body, ctaLabel?, ctaUrl? }
 *   to: "all" | "users" | "admins" | "selected" (+ userIds: string[]) | "user:<id>" | "<email>"
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request)
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()

    if (body.action === "test") {
      const to = typeof body.to === "string" && body.to.includes("@") ? body.to.trim().toLowerCase() : admin.email
      const result = await testEmail(to)
      return NextResponse.json({ ...result, to })
    }

    if (body.action !== "send") return NextResponse.json({ error: "Unknown action" }, { status: 400 })

    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const text = typeof body.body === "string" ? body.body.trim() : ""
    const to = typeof body.to === "string" ? body.to.trim() : ""
    if (subject.length < 2 || subject.length > 150) return NextResponse.json({ error: "Subject must be 2–150 characters" }, { status: 400 })
    if (text.length < 2 || text.length > 5000) return NextResponse.json({ error: "Message must be 2–5000 characters" }, { status: 400 })
    if (!to) return NextResponse.json({ error: "Choose who to send to" }, { status: 400 })

    const ctaUrl = typeof body.ctaUrl === "string" && /^https?:\/\//.test(body.ctaUrl) ? body.ctaUrl.trim() : undefined
    const ctaLabel = ctaUrl && typeof body.ctaLabel === "string" && body.ctaLabel.trim() ? body.ctaLabel.trim().slice(0, 60) : undefined

    let recipients: { email: string; name: string | null }[]
    if (to === "all") recipients = await prisma.user.findMany({ select: { email: true, name: true } })
    else if (to === "users") recipients = await prisma.user.findMany({ where: { role: "user" }, select: { email: true, name: true } })
    else if (to === "admins") recipients = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true, name: true } })
    else if (to === "selected") {
      const ids = Array.isArray(body.userIds) ? body.userIds.filter((v: unknown): v is string => typeof v === "string").slice(0, MAX_RECIPIENTS) : []
      if (ids.length === 0) return NextResponse.json({ error: "Select at least one investor" }, { status: 400 })
      recipients = await prisma.user.findMany({ where: { id: { in: ids } }, select: { email: true, name: true } })
    } else if (to.startsWith("user:")) {
      const u = await prisma.user.findUnique({ where: { id: to.slice(5) }, select: { email: true, name: true } })
      recipients = u ? [u] : []
    } else if (to.includes("@")) {
      const u = await prisma.user.findUnique({ where: { email: to.toLowerCase() }, select: { email: true, name: true } })
      recipients = [u ?? { email: to.toLowerCase(), name: null }]
    } else return NextResponse.json({ error: "Invalid recipient" }, { status: 400 })

    if (recipients.length === 0) return NextResponse.json({ error: "No matching recipients" }, { status: 404 })
    if (recipients.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Too many recipients (max ${MAX_RECIPIENTS} per send)` }, { status: 400 })

    // Sequential in small batches so a shared SMTP relay isn't flooded.
    let sent = 0
    const failed: string[] = []
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10)
      const results = await Promise.all(batch.map((r) => customEmail(r.email, { subject, body: text, name: r.name, ctaLabel, ctaUrl })))
      results.forEach((res, idx) => (res.sent ? sent++ : failed.push(batch[idx]!.email)))
    }

    return NextResponse.json({ success: true, requested: recipients.length, sent, failed, configured: sent > 0 || failed.length === 0 })
  } catch (error) {
    console.error("Admin mail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
