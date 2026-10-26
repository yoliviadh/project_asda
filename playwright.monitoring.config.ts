import { defineConfig, devices } from "@playwright/test"
import { LIVE_TEST_PORT, LIVE_TEST_TOKEN } from "./e2e-monitoring/fixture"

const port = 3210
export default defineConfig({
  testDir: "./e2e-monitoring",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [{
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/monitoring`,
    reuseExistingServer: false,
    env: { MONITORING_MODE: "demo", MONGODB_URI: "", MONGODB_DATABASE: "" },
    timeout: 60_000,
  }, {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${LIVE_TEST_PORT}`,
    url: `http://127.0.0.1:${LIVE_TEST_PORT}/monitoring`,
    reuseExistingServer: false,
    env: {
      MONITORING_MODE: "mongodb",
      MONGODB_URI: "mongodb://127.0.0.1:1", // Deliberately unavailable local endpoint.
      MONGODB_DATABASE: "monitoring_test",
      MONITORING_ORGANIZATION_ID: "test-org",
      MONITORING_SITE_ID: "test-site",
      MONITORING_ACCESS_TOKEN: LIVE_TEST_TOKEN,
    },
    timeout: 60_000,
  }],
})
