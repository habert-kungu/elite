import { test, expect } from "@playwright/test"

test.describe("Deposits & Investments", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("test@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("user123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app", { timeout: 10000 })
  })

  test("should display investment page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Buy Crypto" }).click()
    await expect(page).toHaveURL("/app/investments")
    await expect(page.getByRole("main").getByRole("heading", { name: "Buy Crypto" })).toBeVisible()
  })

  test("should have invest buttons", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Buy Crypto" }).click()
    await expect(page).toHaveURL("/app/investments")
    await expect(page.getByRole("button", { name: /Submit Investment/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("should display transactions page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Transactions" }).click()
    await expect(page).toHaveURL("/app/transactions")
    await expect(page.getByRole("main").getByRole("heading", { name: "Transactions" })).toBeVisible()
  })

  test("should filter transactions by type", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Transactions" }).click()
    await expect(page).toHaveURL("/app/transactions")
    await expect(page.getByRole("button", { name: /all/i })).toBeVisible()
  })
})