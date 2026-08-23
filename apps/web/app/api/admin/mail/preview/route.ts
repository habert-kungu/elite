import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/auth"
import { sampleTemplates } from "@/lib/mail"

/** GET ?key=welcome → renders that template with sample data (admin only). No key → JSON list. */
export async function GET(request: NextRequest) {
  if (!(await getAdminUser(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const key = new URL(request.url).searchParams.get("key")
  const all = sampleTemplates()
  if (!key) return NextResponse.json({ templates: all.map((t) => ({ key: t.key, label: t.label, subject: t.message.subject })) })
  const t = all.find((x) => x.key === key)
  if (!t) return NextResponse.json({ error: "Unknown template" }, { status: 404 })
  return new NextResponse(t.message.html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
}
