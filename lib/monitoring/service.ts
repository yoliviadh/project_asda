import "server-only"
import { monitoringConfig } from "./config"
import { canReadMonitoring } from "./access"
import { demoSnapshot } from "./demo"
import { readMonitoringSnapshot } from "./repository"
import type { MonitoringSnapshot } from "./contracts"

export type MonitoringResult =
  | { ok: true; snapshot: MonitoringSnapshot }
  | { ok: false; reason: "configuration" | "unauthorized" | "unavailable" }

/** Recheck access here even though the route proxy also gates live requests. */
export async function loadMonitoring(authorization: string | null): Promise<MonitoringResult> {
  const config = monitoringConfig()
  if (config.mode === "error") return { ok: false, reason: "configuration" }
  if (!canReadMonitoring(config, authorization)) return { ok: false, reason: "unauthorized" }
  if (config.mode === "demo") return { ok: true, snapshot: demoSnapshot() }
  try {
    return { ok: true, snapshot: await readMonitoringSnapshot(config) }
  } catch {
    // Neither credentials nor driver/validation errors reach the browser/logs.
    return { ok: false, reason: "unavailable" }
  }
}
