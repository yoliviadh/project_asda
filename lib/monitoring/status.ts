import type { Reading } from "./contracts"
import type { Sensor } from "./models"

export type SensorStatus = "online" | "stale" | "offline" | "no-data" | "disabled" | "invalid"
export function sensorStatus(sensor: Sensor, latest: Reading | null, now: Date): SensorStatus {
  if (!sensor.enabled) return "disabled"
  if (!latest) return "no-data"
  const age = now.getTime() - Date.parse(latest.observedAt)
  if (!Number.isFinite(age) || age < -60_000 || latest.quality === "invalid") return "invalid"
  if (age > sensor.samplingIntervalSeconds * 1000 * 10) return "offline"
  if (age > sensor.samplingIntervalSeconds * 1000 * 3) return "stale"
  return "online"
}

export function sensorCondition(sensor: Sensor, reading: Reading | null): "normal" | "warning" | "unknown" {
  if (!reading || reading.quality !== "good") return "unknown"
  return (sensor.warningMin !== undefined && reading.value < sensor.warningMin) ||
    (sensor.warningMax !== undefined && reading.value > sensor.warningMax) ? "warning" : "normal"
}
