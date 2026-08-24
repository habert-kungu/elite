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
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Trade" }).click()
    await expect(page).toHaveURL("/app/investments")
    await expect(page.getByRole("main").getByRole("heading", { name: "Trade" })).toBeVisible()
  })

  test("should have invest buttons", async ({ page }) => {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Trade" }).click()
    await expect(page).toHaveURL("/app/investments")
    await expect(page.getByRole("button", { name: /Start trading/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("should display transactions page", async ({ page }) => {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reports" }).click()
    await expect(page).toHaveURL("/app/transactions")
    await expect(page.getByRole("main").getByRole("heading", { name: "Reports" })).toBeVisible()
  })

  test("should filter transactions by type", async ({ page }) => {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reports" }).click()
    await expect(page).toHaveURL("/app/transactions")
    await expect(page.getByRole("tab", { name: "All", exact: true })).toBeVisible()
  })
})