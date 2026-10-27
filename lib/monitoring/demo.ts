import type { MonitoringSnapshot } from "./contracts"
import { sensorSchema, type Sensor } from "./models"

/** Synthetic values only. This module never imports a database or writes readings. */
export function demoSnapshot(now = new Date()): MonitoringSnapshot {
  const scope = { organizationId: "demo", siteId: "demo-mill", schemaVersion: 1 as const }
  const sensors: Sensor[] = [
    { ...scope, id: "S-TEMP-01", assetId: "silo-01", name: "Silo temperature", metric: "temperature", unit: "°C", enabled: true, samplingIntervalSeconds: 300, warningMin: 15, warningMax: 35 },
    { ...scope, id: "S-HUM-01", assetId: "silo-01", name: "Storage humidity", metric: "humidity", unit: "%RH", enabled: true, samplingIntervalSeconds: 300, warningMin: 40, warningMax: 70 },
    { ...scope, id: "S-MOIST-01", assetId: "dryer-01", name: "Grain moisture", metric: "moisture", unit: "%", enabled: true, samplingIntervalSeconds: 300, warningMin: 10, warningMax: 14 },
    { ...scope, id: "S-POWER-01", assetId: "line-01", name: "Processing power", metric: "power", unit: "kW", enabled: true, samplingIntervalSeconds: 300, warningMax: 90 },
  ].map(sensor => sensorSchema.parse(sensor))
  const bases = [28.4, 62.8, 15.2, 48.6]
  const amplitudes = [2.1, 4.8, 0.6, 7.2]
  const lastTimes = [now.getTime() - 60_000, now.getTime() - 120_000, now.getTime() - 180_000, now.getTime() - 75 * 60_000]
  return {
    source: "demo", generatedAt: now.toISOString(), siteName: "Demo grain processing site", sensorsTruncated: false,
    sensors: sensors.map((sensor, index) => {
      const history = Array.from({ length: 48 }, (_, i) => ({
        value: Number((bases[index] + Math.sin((47 - i) / 5) * amplitudes[index]).toFixed(1)),
        observedAt: new Date(lastTimes[index] - (47 - i) * 30 * 60_000).toISOString(),
        quality: "good" as const,
      }))
      return {
        sensor,
        assetName: index < 2 ? "Grain silo 01" : index === 2 ? "Dryer 01" : "Processing line 01",
        location: index < 2 ? "Storage zone A" : "Processing hall",
        latest: history.at(-1)!, history, historyTruncated: false,
      }
    }),
  }
}
