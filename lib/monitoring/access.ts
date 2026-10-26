import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"
import type { MonitoringConfig } from "./config"

/** Temporary, read-only single-site operator gate. Use HTTPS when deployed. */
export function canReadMonitoring(config: MonitoringConfig, authorization: string | null): boolean {
  if (config.mode === "demo") return true
  if (config.mode !== "mongodb" || !authorization || authorization.length > 4096) return false
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization)
  if (!match) return false
  const actual = Buffer.from(match[1], "base64").toString("utf8")
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(actual), digest(`monitor:${config.accessToken}`))
}
