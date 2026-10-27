import { expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("./db", () => ({ monitoringCollections: vi.fn() }))
import { monitoringCollections } from "./db"
import { readMonitoringSnapshot } from "./repository"
import { demoSnapshot } from "./demo"

it("scopes every collection query, orders by observation time, and strips database internals", async () => {
  const now = new Date("2026-10-26T06:00:00Z")
  const sensor = demoSnapshot(now).sensors[0].sensor
  const scope = { organizationId: sensor.organizationId, siteId: sensor.siteId }
  const row = { ...scope, _id: "private-db-id", id: "reading-1", schemaVersion: 1, sensorId: sensor.id, assetId: sensor.assetId, eventId: "event-1", metric: sensor.metric, unit: sensor.unit, value: 0, quality: "good", observedAt: now, receivedAt: now }
  const cursor = (data: unknown[]) => ({ sort: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue(data), next: vi.fn().mockResolvedValue(data[0] ?? null) })
  const sensorCursor = cursor([sensor])
  const telemetryCursor = cursor([row])
  const collections = {
    sensors: { find: vi.fn(() => sensorCursor) },
    assets: { findOne: vi.fn().mockResolvedValue({ ...scope, id: sensor.assetId, schemaVersion: 1, name: "Silo", kind: "storage", location: "Zone A", createdAt: now, updatedAt: now }) },
    telemetry: { find: vi.fn(() => telemetryCursor) },
  }
  vi.mocked(monitoringCollections).mockResolvedValue(collections as unknown as Awaited<ReturnType<typeof monitoringCollections>>)
  const result = await readMonitoringSnapshot({ mode: "mongodb", uri: "mongodb://localhost", database: "test", ...scope, accessToken: "unused-test-token" }, now)
  expect(collections.sensors.find).toHaveBeenCalledWith(scope, expect.any(Object))
  expect(collections.assets.findOne).toHaveBeenCalledWith({ ...scope, id: sensor.assetId }, expect.any(Object))
  for (const call of collections.telemetry.find.mock.calls as unknown as [Record<string, unknown>][]) expect(call[0]).toMatchObject({ ...scope, sensorId: sensor.id })
  expect(telemetryCursor.sort).toHaveBeenCalledWith({ observedAt: -1, eventId: -1 })
  expect(result.sensors[0].latest).toEqual({ value: 0, quality: "good", observedAt: now.toISOString() })
  expect(JSON.stringify(result)).not.toContain("private-db-id")
})
