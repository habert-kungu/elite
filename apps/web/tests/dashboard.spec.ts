import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("test@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("user123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app", { timeout: 10000 })
  })

  test("should display dashboard overview", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^(Hi, .*|Overview)$/ })).toBeVisible()
    await expect(page.getByText("Total assets")).toBeVisible()
  })

  test("should display header navigation", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" })
    await expect(nav.getByRole("link", { name: "Overview" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Trade" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Markets" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible()
  })

  test("should navigate to transactions page", async ({ page }) => {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reports" }).click()
    await expect(page).toHaveURL("/app/transactions")
    await expect(page.getByRole("main").getByRole("heading", { name: "Reports" })).toBeVisible()
  })

  test("should navigate to investments page", async ({ page }) => {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Trade" }).click()
    await expect(page).toHaveURL("/app/investments")
    await expect(page.getByRole("main").getByRole("heading", { name: "Trade" })).toBeVisible()
  })

  test("should navigate to withdraw page", async ({ page }) => {
    await page.goto("/app/withdraw")
    await expect(page).toHaveURL("/app/withdraw")
    await expect(page.getByRole("heading", { name: "Cashier", level: 1 })).toBeVisible()
  })

  test("should navigate to profile page", async ({ page }) => {
    await page.goto("/app/profile")
    await expect(page).toHaveURL("/app/profile")
    await expect(page.getByRole("main").getByRole("heading", { name: "Account settings" })).toBeVisible()
  })

  test("should display account balance in header", async ({ page }) => {
    await expect(page.getByTitle("Total assets")).toBeVisible()
    await expect(page.getByTitle("Total assets")).toContainText("USD")
  })
})