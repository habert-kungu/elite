import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { calculateRoi, calculateTargetReturn } from "../lib/trading"

const prisma = new PrismaClient()

const DEMO_EMAILS = ["admin@nextlevel.com", "test@nextlevel.com"]

/**
 * Clear the demo accounts' portfolio rows so re-seeding replaces the sample
 * data instead of stacking another copy on top of it. Only the two seeded
 * accounts are touched — real signups keep their records.
 */
async function resetDemoPortfolios() {
  const demo = await prisma.user.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true } })
  if (demo.length === 0) return
  const userId = { in: demo.map((u) => u.id) }
  await prisma.cycle.deleteMany({ where: { userId } })
  await prisma.investment.deleteMany({ where: { userId } })
  await prisma.transaction.deleteMany({ where: { userId } })
  console.log(`Cleared previous sample data for ${demo.length} demo account(s)`)
}

async function main() {
  console.log("Seeding database...")

  await resetDemoPortfolios()

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@nextlevel.com" },
    update: {},
    create: {
      email: "admin@nextlevel.com",
      name: "Admin User",
      password: adminPassword,
      role: "admin",
      telegram: "@admin",
    },
  })
  console.log("Created admin:", admin.email)

  // Create test user
  const userPassword = await bcrypt.hash("user123", 10)
  const testUser = await prisma.user.upsert({
    where: { email: "test@nextlevel.com" },
    update: {},
    create: {
      email: "test@nextlevel.com",
      name: "Test User",
      password: userPassword,
      role: "user",
      telegram: "@testuser",
    },
  })
  console.log("Created test user:", testUser.email)

  // Sample investments across the live plans (roi comes from each plan's payout table)
  const investment1 = await prisma.investment.create({
    data: {
      userId: testUser.id,
      pool: "daily",
      amount: 500,
      network: "TRC20",
      currency: "USDT",
      txHash: "0xabc123",
      status: "active",
      roi: calculateRoi(500, "daily"),
    },
  })

  const investment2 = await prisma.investment.create({
    data: {
      userId: testUser.id,
      pool: "pro5",
      amount: 2000,
      network: "TRC20",
      currency: "USDT",
      txHash: "0xdef456",
      status: "active",
      roi: calculateRoi(2000, "pro5"),
    },
  })

  // Premium is denominated in BTC and still awaiting review.
  await prisma.investment.create({
    data: {
      userId: testUser.id,
      pool: "premium12",
      amount: 1,
      network: "BTC",
      currency: "BTC",
      txHash: "0xbtc789",
      status: "pending",
      roi: calculateRoi(1, "premium12"),
    },
  })
  console.log("Created sample investments")

  // Create cycles for active investments
  await prisma.cycle.create({
    data: {
      investmentId: investment1.id,
      userId: testUser.id,
      startValue: 500,
      currentValue: 2750,
      targetValue: calculateTargetReturn(500, "daily"),
      progress: 50,
      status: "active",
    },
  })

  await prisma.cycle.create({
    data: {
      investmentId: investment2.id,
      userId: testUser.id,
      startValue: 2000,
      currentValue: 10400,
      targetValue: calculateTargetReturn(2000, "pro5"),
      progress: 30,
      status: "active",
    },
  })
  console.log("Created sample cycles")

  // Create sample transactions
  await prisma.transaction.createMany({
    data: [
      {
        userId: testUser.id,
        type: "deposit",
        amount: 100,
        netAmount: 100,
        currency: "USDT",
        txHash: "0xabc123",
        status: "completed",
      },
      {
        userId: testUser.id,
        type: "deposit",
        amount: 500,
        netAmount: 500,
        currency: "USDT",
        txHash: "0xdef456",
        status: "completed",
      },
      {
        userId: testUser.id,
        type: "investment",
        amount: 600,
        netAmount: 600,
        currency: "USDT",
        status: "completed",
      },
    ],
  })
  console.log("Created sample transactions")

  console.log("\n✅ Seed completed!")
  console.log("\n📝 Credentials:")
  console.log("Admin: admin@nextlevel.com / admin123")
  console.log("User:  test@nextlevel.com / user123")
  console.log("\n🔗 URLs:")
  console.log("Login: http://localhost:3000/login")
  console.log("Admin: http://localhost:3000/app/admin")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })