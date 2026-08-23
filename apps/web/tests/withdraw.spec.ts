import { test, expect } from "@playwright/test"

test.describe("Withdraw Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("test@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("user123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app", { timeout: 10000 })
  })

  test("should display withdraw page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Withdraw", exact: true }).click()
    await expect(page).toHaveURL("/app/withdraw")
    await expect(page.getByRole("heading", { name: "Withdraw", level: 1 })).toBeVisible()
  })

  test("should show amount input", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Withdraw", exact: true }).click()
    await expect(page).toHaveURL("/app/withdraw")
    await expect(page.getByPlaceholder("0.00")).toBeVisible({ timeout: 10000 })
  })

  test("should have withdraw button", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: "Withdraw", exact: true }).click()
    await expect(page).toHaveURL("/app/withdraw")
    await expect(page.getByRole("button", { name: /Request via Telegram/i })).toBeVisible({ timeout: 10000 })
  })
})