import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

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

  // Create some sample investments for test user
  const investment1 = await prisma.investment.create({
    data: {
      userId: testUser.id,
      pool: "daily",
      amount: 100,
      network: "TRC20",
      txHash: "0xabc123",
      status: "active",
      roi: 10,
    },
  })

  const investment2 = await prisma.investment.create({
    data: {
      userId: testUser.id,
      pool: "weekly",
      amount: 500,
      network: "TRC20",
      txHash: "0xdef456",
      status: "active",
      roi: 10,
    },
  })
  console.log("Created sample investments")

  // Create cycles for active investments
  await prisma.cycle.create({
    data: {
      investmentId: investment1.id,
      userId: testUser.id,
      startValue: 100,
      currentValue: 250,
      targetValue: 1000,
      progress: 50,
      status: "active",
    },
  })

  await prisma.cycle.create({
    data: {
      investmentId: investment2.id,
      userId: testUser.id,
      startValue: 500,
      currentValue: 1500,
      targetValue: 5000,
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