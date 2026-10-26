import { expect, test } from "@playwright/test"
import { LIVE_TEST_PORT, LIVE_TEST_TOKEN } from "./fixture"

test("root opens labeled demo with working chart, status indicators and refresh", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/")
  await expect(page).toHaveURL(/\/monitoring$/)
  await expect(page.getByRole("heading", { name: "Sensor monitoring", exact: true })).toBeVisible()
  await expect(page.getByText("Demo mode — synthetic sensor data")).toBeVisible()
  await expect(page.getByText(/no demo reading has been saved to MongoDB/i)).toBeVisible()
  await expect(page.getByTestId("sensor-card")).toHaveCount(4)
  await expect(page.getByTestId("sensor-card").filter({ hasText: "Offline" })).toHaveCount(1)
  await expect(page.getByText("Outside warning range")).toBeVisible()
  await page.getByLabel("Chart sensor").selectOption("S-HUM-01")
  await expect(page.getByRole("img", { name: /Storage humidity: minimum/ })).toBeVisible()
  await page.getByRole("button", { name: "6h", exact: true }).click()
  await expect(page.getByText(/last 6 hours/)).toBeVisible()
  await page.getByText("View chart data", { exact: true }).click()
  await expect(page.getByRole("columnheader", { name: "Value (%RH)" })).toBeVisible()
  await page.getByRole("button", { name: "Refresh readings" }).click()
  await expect(page.getByRole("button", { name: "Refresh readings" })).toBeEnabled()
  await expect(page.getByText("Demo mode — synthetic sensor data")).toBeVisible()
  expect(errors).toEqual([])
})

test("retains dark theme and sidebar interaction", async ({ page }) => {
  await page.goto("/monitoring")
  const previous = await page.locator("html").getAttribute("class")
  await page.getByRole("button", { name: "Toggle dark mode" }).click()
  await expect(page.locator("html")).not.toHaveAttribute("class", previous ?? "")
  const themed = await page.locator("html").getAttribute("class")
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("class", themed!)
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).first().click()
  await expect(page.locator('[data-slot="sidebar"][data-state="collapsed"]')).toBeVisible()
})

test("fits a mobile viewport and opens mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/monitoring")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).first().click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("dialog").getByText("Historical trends", { exact: true })).toBeVisible()
})

test("requires authentication before returning a live monitoring page", async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:${LIVE_TEST_PORT}/monitoring`)
  expect(response.status()).toBe(401)
  expect(response.headers()["www-authenticate"]).toContain("Basic")
  expect(await response.text()).not.toContain(LIVE_TEST_TOKEN)
})

test("shows an honest error instead of demo data when MongoDB is unavailable", async ({ browser }) => {
  const context = await browser.newContext({ httpCredentials: { username: "monitor", password: LIVE_TEST_TOKEN } })
  try {
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${LIVE_TEST_PORT}/monitoring`)
    await expect(page.getByText("Sensor data unavailable", { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Demo data has not been substituted/)).toBeVisible()
    await expect(page.getByTestId("sensor-card")).toHaveCount(0)
    const html = await page.content()
    expect(html).not.toContain(LIVE_TEST_TOKEN)
    expect(html).not.toContain("mongodb://")
  } finally {
    await context.close()
  }
})
