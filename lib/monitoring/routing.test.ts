import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn(() => NextResponse.next()) }))
import { updateSession } from "@/lib/supabase/middleware"
import { proxy } from "@/proxy"

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("MONITORING_MODE", "demo") })
afterEach(() => vi.unstubAllEnvs())

it("serves the new entry point and monitoring route without invoking legacy auth", async () => {
  for (const path of ["/", "/monitoring", "/monitoring/child"]) {
    const result = await proxy(new NextRequest(`http://localhost${path}`))
    expect(result.status).toBe(200)
  }
  expect(updateSession).not.toHaveBeenCalled()
})

it("retains legacy auth for ERP routes and similarly named unrelated paths", async () => {
  for (const path of ["/dashboard", "/monitoring-other"]) await proxy(new NextRequest(`http://localhost${path}`))
  expect(updateSession).toHaveBeenCalledTimes(2)
})

it("challenges live requests and prevents shared caching of authenticated results", async () => {
  const token = "test-only-monitoring-operator-token-long-enough"
  Object.entries({ MONITORING_MODE: "mongodb", MONGODB_URI: "mongodb://localhost", MONGODB_DATABASE: "test", MONITORING_ORGANIZATION_ID: "org", MONITORING_SITE_ID: "site", MONITORING_ACCESS_TOKEN: token }).forEach(([key, value]) => vi.stubEnv(key, value))
  const denied = await proxy(new NextRequest("http://localhost/monitoring"))
  expect(denied.status).toBe(401)
  expect(denied.headers.get("www-authenticate")).toContain("Basic")
  const allowed = await proxy(new NextRequest("http://localhost/monitoring", { headers: { authorization: `Basic ${Buffer.from(`monitor:${token}`).toString("base64")}` } }))
  expect(allowed.status).toBe(200)
  expect(allowed.headers.get("cache-control")).toBe("private, no-store")
  expect(updateSession).not.toHaveBeenCalled()
})
