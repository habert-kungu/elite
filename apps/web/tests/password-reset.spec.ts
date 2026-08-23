import { test, expect } from "@playwright/test"

test.describe("Password recovery", () => {
  test("login page links to forgot password", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Forgot?" }).click()
    await expect(page).toHaveURL("/forgot-password")
    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible()
  })

  test("forgot password always reports success (no account enumeration)", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.getByPlaceholder("name@example.com").fill("nobody@example.com")
    await page.getByRole("button", { name: "Send reset link" }).click()
    await expect(page.getByText("Check your inbox")).toBeVisible({ timeout: 10000 })
  })

  test("reset page rejects a bad token", async ({ page }) => {
    await page.goto("/reset-password?token=definitely-not-a-real-token-value")
    await page.getByLabel("New password").fill("newpass123")
    await page.getByLabel("Confirm password").fill("newpass123")
    await page.getByRole("button", { name: "Update password" }).click()
    await expect(page.getByText(/invalid or has expired/)).toBeVisible({ timeout: 10000 })
  })

  test("reset page without a token offers a new link", async ({ page }) => {
    await page.goto("/reset-password")
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible()
  })
})
