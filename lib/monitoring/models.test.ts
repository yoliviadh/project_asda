import { describe, expect, it } from "vitest"
import { assetSchema, sensorSchema, telemetrySchema } from "./models"
import { demoSnapshot } from "./demo"
import { sensorCondition, sensorStatus } from "./status"
import { chartSegments } from "./chart"

const now = new Date("2026-10-26T06:00:00Z")
const demo = demoSnapshot(now)
const sensor = demo.sensors[0].sensor
const reading = { value: 0, observedAt: now.toISOString(), quality: "good" as const }

describe("monitoring data models", () => {
  it("validates assets and rejects invalid identifiers", () => {
    const asset = { id: "silo-01", organizationId: "demo", siteId: "demo-mill", schemaVersion: 1, name: "Silo", kind: "storage", location: "Zone A", createdAt: now, updatedAt: now }
    expect(assetSchema.parse(asset).id).toBe("silo-01")
    expect(assetSchema.safeParse({ ...asset, siteId: { $ne: null } }).success).toBe(false)
  })
  it("requires metric/unit consistency and ordered thresholds", () => {
    expect(sensorSchema.safeParse({ ...sensor, unit: "kW" }).success).toBe(false)
    expect(sensorSchema.safeParse({ ...sensor, warningMin: 50, warningMax: 30 }).success).toBe(false)
  })
  it("rejects non-finite telemetry and accepts genuine zero measurements", () => {
    const telemetry = { ...sensor, id: "reading-1", sensorId: sensor.id, eventId: "event-1", value: 0, observedAt: now, receivedAt: now, quality: "good" }
    expect(telemetrySchema.parse(telemetry).value).toBe(0)
    for (const value of [NaN, Infinity, "12"]) expect(telemetrySchema.safeParse({ ...telemetry, value }).success).toBe(false)
    expect(telemetrySchema.safeParse({ ...telemetry, observedAt: "yesterday" }).success).toBe(false)
  })
})

describe("sensor health", () => {
  it("keeps freshness separate from threshold condition", () => {
    expect(sensorStatus(sensor, reading, now)).toBe("online")
    expect(sensorCondition(sensor, reading)).toBe("warning")
    expect(sensorStatus(sensor, { ...reading, observedAt: new Date(+now - 16 * 60_000).toISOString() }, now)).toBe("stale")
    expect(sensorStatus(sensor, { ...reading, observedAt: new Date(+now - 51 * 60_000).toISOString() }, now)).toBe("offline")
  })
  it("does not turn missing, future, invalid or suspect readings into healthy values", () => {
    expect(sensorStatus(sensor, null, now)).toBe("no-data")
    expect(sensorStatus({ ...sensor, enabled: false }, reading, now)).toBe("disabled")
    expect(sensorStatus(sensor, { ...reading, observedAt: "bad-date" }, now)).toBe("invalid")
    expect(sensorStatus(sensor, { ...reading, observedAt: new Date(+now + 120_000).toISOString() }, now)).toBe("invalid")
    expect(sensorCondition(sensor, { ...reading, quality: "suspect" })).toBe("unknown")
    expect(sensorStatus(sensor, { ...reading, quality: "invalid" }, now)).toBe("invalid")
  })
  it("creates deterministic and explicitly labeled fixtures", () => {
    expect(demoSnapshot(now)).toEqual(demo)
    expect(demo.source).toBe("demo")
    expect(demo.sensors.map(view => sensorStatus(view.sensor, view.latest, now))).toEqual(["online", "online", "online", "offline"])
    expect(sensorCondition(demo.sensors[2].sensor, demo.sensors[2].latest)).toBe("warning")
  })
})

it("chart preserves negative values and splits invalid samples and missing intervals", () => {
  const rows = [0, 1, 2, 3, 20].map((minutes, i) => ({ ...reading, value: -10 + i, observedAt: new Date(+now + minutes * 60_000).toISOString(), quality: i === 2 ? "invalid" as const : "good" as const }))
  const segments = chartSegments(rows, 5 * 60_000)
  expect(segments.map(segment => segment.map(row => row.value))).toEqual([[-10, -9], [-7], [-6]])
})
