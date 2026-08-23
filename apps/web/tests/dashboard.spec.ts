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
    await expect(page.getByText("Dashboard")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("should display sidebar navigation", async ({ page }) => {
    await expect(page.getByRole("navigation").getByRole("link", { name: "Transactions" })).toBeVisible()
    await expect(page.getByRole("navigation").getByRole("link", { name: "Buy Crypto" })).toBeVisible()
    await expect(page.getByRole("navigation").getByRole("link", { name: "Withdraw" })).toBeVisible()
    await expect(page.getByRole("navigation").getByRole("link", { name: "Profile" })).toBeVisible()
  })

  test("should navigate to transactions page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Transactions" }).click()
    await expect(page).toHaveURL("/app/transactions")
    await expect(page.getByRole("main").getByRole("heading", { name: "Transactions" })).toBeVisible()
  })

  test("should navigate to investments page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Buy Crypto" }).click()
    await expect(page).toHaveURL("/app/investments")
    await expect(page.getByRole("main").getByRole("heading", { name: "Buy Crypto" })).toBeVisible()
  })

  test("should navigate to withdraw page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Withdraw", exact: true }).click()
    await expect(page).toHaveURL("/app/withdraw")
    await expect(page.getByRole("heading", { name: "Withdraw", level: 1 })).toBeVisible()
  })

  test("should navigate to profile page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Profile" }).click()
    await expect(page).toHaveURL("/app/profile")
    await expect(page.getByRole("main").getByRole("heading", { name: "Profile" })).toBeVisible()
  })

  test("should display user info in sidebar", async ({ page }) => {
    await expect(page.locator(".text-\\[13px\\]").first()).toBeVisible()
  })
})