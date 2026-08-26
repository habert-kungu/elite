// Idempotent schema sync for existing SQLite volumes. The image bakes a fresh,
// fully-pushed DB for first boot; this brings an *existing* prod.db up to date
// with additive changes (no prisma CLI in the runtime image). Safe to re-run.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function hasTable(name) {
  const rows = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`)
  return rows.length > 0
}

async function hasColumn(table, column) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)
  return rows.some((r) => r.name === column)
}

try {
  if (!(await hasColumn("User", "password"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "password" TEXT`)
    console.log("→ db-sync: added User.password")
  }

  if (!(await hasColumn("User", "tokenVersion"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0`)
    console.log("→ db-sync: added User.tokenVersion")
  }

  if (!(await hasColumn("Cycle", "progressAt"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Cycle" ADD COLUMN "progressAt" DATETIME`)
    console.log("→ db-sync: added Cycle.progressAt")
  }

  if (!(await hasColumn("User", "twoFactorEnabled"))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false`)
    console.log("→ db-sync: added User.twoFactorEnabled")
  }
  if (!(await hasTable("TwoFactorCode"))) {
    await prisma.$executeRawUnsafe(`CREATE TABLE "TwoFactorCode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "purpose" TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" DATETIME NOT NULL,
      "usedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TwoFactorCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TwoFactorCode_userId_purpose_idx" ON "TwoFactorCode"("userId", "purpose")`)
    console.log("→ db-sync: created TwoFactorCode")
  }

  if (!(await hasTable("PasswordResetToken"))) {
    await prisma.$executeRawUnsafe(`CREATE TABLE "PasswordResetToken" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" DATETIME NOT NULL,
      "usedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`)
    console.log("→ db-sync: created PasswordResetToken")
  }
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`)

  // Two-step verification is mandatory platform-wide: switch it on for every
  // account carried over from an older image. Idempotent by design.
  const enforced = await prisma.$executeRawUnsafe(`UPDATE "User" SET "twoFactorEnabled" = 1 WHERE "twoFactorEnabled" = 0`)
  if (enforced > 0) console.log(`→ db-sync: enabled two-step verification on ${enforced} account(s)`)

  console.log("→ db-sync: schema up to date")
} catch (err) {
  console.error("db-sync failed:", err)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
