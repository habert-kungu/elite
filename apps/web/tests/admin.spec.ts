import { test, expect } from "@playwright/test"

test.describe("Admin Panel", () => {
  test("should redirect regular user from admin panel", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("test@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("user123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app", { timeout: 10000 })

    await page.goto("/app/admin")
    await expect(page).toHaveURL("/app")
  })

  test("admin should access admin panel", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })
  })

  test("admin should see dashboard stats", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await expect(page.getByText("Total Users")).toBeVisible()
    await expect(page.getByText("Active Investments")).toBeVisible()
  })

  test("admin should navigate to deposits page", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.getByRole("navigation").getByRole("link", { name: "Deposits", exact: true }).click()
    await expect(page).toHaveURL("/app/admin/deposits")
    await expect(page.getByRole("main").getByRole("heading", { name: "Deposits" })).toBeVisible()
  })

  test("admin should navigate to users page", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.getByRole("navigation").getByRole("link", { name: "Users", exact: true }).click()
    await expect(page).toHaveURL("/app/admin/users")
    await expect(page.getByRole("main").getByRole("heading", { name: "Users" })).toBeVisible()
  })

  test("admin should navigate to investments page", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.getByRole("navigation").getByRole("link", { name: "Investments", exact: true }).click()
    await expect(page).toHaveURL("/app/admin/investments")
    await expect(page.getByRole("main").getByRole("heading", { name: "Investments" })).toBeVisible()
  })

  test("admin should navigate to transactions page", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.getByRole("navigation").getByRole("link", { name: "Transactions", exact: true }).click()
    await expect(page).toHaveURL("/app/admin/transactions")
    await expect(page.getByRole("main").getByRole("heading", { name: "Transactions" })).toBeVisible()
  })

  test("admin should be able to go back to user dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.getByRole("link", { name: "User", exact: true }).click()
    await expect(page).toHaveURL("/app")
  })

  test("admin can add and remove a user", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.goto("/app/admin/users")
    const email = `e2e-${Date.now()}@test.com`
    await page.getByRole("button", { name: "Add user" }).click()
    await page.getByPlaceholder("Jane Doe").fill("E2E User")
    await page.getByPlaceholder("jane@example.com").fill(email)
    await page.getByRole("button", { name: "Create user" }).click()
    await expect(page.getByText("Account created")).toBeVisible({ timeout: 10000 })

    await page.getByPlaceholder("Search by name, email or Telegram…").fill(email)
    const row = page.getByRole("row").filter({ hasText: email })
    await expect(row).toBeVisible({ timeout: 10000 })
    await row.getByRole("button", { name: "Remove" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Remove user" }).click()
    await expect(page.getByText(/Removed/)).toBeVisible({ timeout: 10000 })
    await expect(row).toHaveCount(0)
  })

  test("admin cannot remove their own account", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.goto("/app/admin/users")
    const row = page.getByRole("row").filter({ hasText: "admin@nextlevel.com" })
    await expect(row.getByRole("button", { name: "Remove" })).toBeDisabled()
  })

  test("admin should navigate to communications page", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("admin@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("admin123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app/admin", { timeout: 10000 })

    await page.getByRole("navigation").getByRole("link", { name: "Communications", exact: true }).click()
    await expect(page).toHaveURL("/app/admin/communications")
    await expect(page.getByRole("main").getByRole("heading", { name: "Communications" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Send me a test email" })).toBeVisible()
  })
})
