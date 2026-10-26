import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("./repository", () => ({ readMonitoringSnapshot: vi.fn() }))
import { monitoringConfig } from "./config"
import { canReadMonitoring } from "./access"
import { readMonitoringSnapshot } from "./repository"
import { loadMonitoring } from "./service"

const env = {
  MONITORING_MODE: "mongodb", MONGODB_URI: "mongodb://localhost:27017", MONGODB_DATABASE: "agro_test",
  MONITORING_ORGANIZATION_ID: "org-1", MONITORING_SITE_ID: "site-1", MONITORING_ACCESS_TOKEN: "test-only-token-with-at-least-32-characters",
}
const authorization = `Basic ${Buffer.from(`monitor:${env.MONITORING_ACCESS_TOKEN}`).toString("base64")}`
beforeEach(() => {
  vi.resetAllMocks()
  for (const key of Object.keys(env)) vi.stubEnv(key, "")
})
afterEach(() => vi.unstubAllEnvs())

describe("configuration and operator access", () => {
  it("uses demo only when intentionally selected or both DB settings are absent", () => {
    expect(monitoringConfig({})).toEqual({ mode: "demo" })
    expect(monitoringConfig({ ...env, MONITORING_MODE: "demo" })).toEqual({ mode: "demo" })
    expect(monitoringConfig({ MONGODB_DATABASE: "partial" })).toEqual({ mode: "error" })
    expect(monitoringConfig({ MONITORING_MODE: "mongodb" })).toEqual({ mode: "error" })
    expect(monitoringConfig({ MONITORING_MODE: "typo" })).toEqual({ mode: "error" })
  })
  it("rejects unsafe scopes, missing gate credentials and invalid configuration", () => {
    for (const overrides of [{ MONITORING_ACCESS_TOKEN: "short" }, { MONITORING_SITE_ID: "$ne" }, { MONGODB_DATABASE: "a/b" }, { MONGODB_URI: "https://example.com" }]) {
      expect(monitoringConfig({ ...env, ...overrides })).toEqual({ mode: "error" })
    }
  })
  it("authorizes only the configured single-site operator", () => {
    const config = monitoringConfig(env)
    expect(canReadMonitoring(config, authorization)).toBe(true)
    for (const value of [null, "Basic !!!", "Bearer token", `Basic ${Buffer.from("other:password").toString("base64")}`]) expect(canReadMonitoring(config, value)).toBe(false)
  })
})

describe("data source boundary", () => {
  it("never touches MongoDB in demo mode", async () => {
    const result = await loadMonitoring(null)
    expect(result.ok && result.snapshot.source).toBe("demo")
    expect(readMonitoringSnapshot).not.toHaveBeenCalled()
  })
  it("does not query stored data before authentication", async () => {
    Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value))
    expect(await loadMonitoring(null)).toEqual({ ok: false, reason: "unauthorized" })
    expect(readMonitoringSnapshot).not.toHaveBeenCalled()
  })
  it("keeps an empty MongoDB database empty", async () => {
    Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value))
    vi.mocked(readMonitoringSnapshot).mockResolvedValue({ source: "mongodb", generatedAt: new Date().toISOString(), siteName: "site-1", sensors: [], sensorsTruncated: false })
    const result = await loadMonitoring(authorization)
    expect(result.ok && result.snapshot.sensors).toEqual([])
    expect(result.ok && result.snapshot.source).toBe("mongodb")
  })
  it("redacts connection errors and never falls back to demo", async () => {
    Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value))
    vi.mocked(readMonitoringSnapshot).mockRejectedValue(new Error("mongodb://private-user:private-password@private-host"))
    expect(await loadMonitoring(authorization)).toEqual({ ok: false, reason: "unavailable" })
  })
})
