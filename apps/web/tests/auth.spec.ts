import { test, expect } from "@playwright/test"

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("should display login page correctly", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByPlaceholder("name@example.com")).toBeVisible()
    await expect(page.getByPlaceholder("••••••••")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await page.getByPlaceholder("name@example.com").fill("invalid@test.com")
    await page.getByPlaceholder("••••••••").fill("wrongpassword")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 10000 })
  })

test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder("name@example.com").fill("test@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("user123")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/app", { timeout: 10000 })
    await expect(page.getByText("Dashboard")).toBeVisible()
  })

  test("should redirect to login when accessing dashboard without auth", async ({ page }) => {
    await page.goto("/app")
    await expect(page).toHaveURL("/login")
  })

  test("should navigate to signup page", async ({ page }) => {
    await page.getByRole("link", { name: "Sign up" }).click()
    await expect(page).toHaveURL("/signup")
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible()
  })

  test("should create new account successfully", async ({ page }) => {
    const timestamp = Date.now()
    await page.goto("/signup")

    await page.getByPlaceholder("John Doe").fill(`New User ${timestamp}`)
    await page.getByPlaceholder("name@example.com").fill(`new${timestamp}@test.com`)
    await page.getByPlaceholder("••••••••").fill("password123")
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(page).toHaveURL("/app", { timeout: 15000 })
  })

  test("should show error for duplicate email on signup", async ({ page }) => {
    await page.goto("/signup")

    await page.getByPlaceholder("John Doe").fill("Duplicate User")
    await page.getByPlaceholder("name@example.com").fill("test@nextlevel.com")
    await page.getByPlaceholder("••••••••").fill("password123")
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(page.getByText("Email already in use")).toBeVisible({ timeout: 10000 })
  })
})