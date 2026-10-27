import "server-only"

export type MonitoringConfig =
  | { mode: "demo" }
  | { mode: "error" }
  | { mode: "mongodb"; uri: string; database: string; organizationId: string; siteId: string; accessToken: string }

/** Never serialize this configuration into a page, log, or client component. */
export function monitoringConfig(env: Record<string, string | undefined> = process.env): MonitoringConfig {
  const mode = env.MONITORING_MODE?.trim() || "auto"
  if (mode === "demo") return { mode: "demo" }
  if (!["auto", "mongodb"].includes(mode)) return { mode: "error" }
  const uri = env.MONGODB_URI?.trim()
  const database = env.MONGODB_DATABASE?.trim()
  if (mode === "auto" && !uri && !database) return { mode: "demo" }
  const organizationId = env.MONITORING_ORGANIZATION_ID?.trim()
  const siteId = env.MONITORING_SITE_ID?.trim()
  const accessToken = env.MONITORING_ACCESS_TOKEN
  const validId = (value?: string) => !!value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri) || !database ||
      !/^[a-zA-Z0-9_-]{1,63}$/.test(database) || !validId(organizationId) ||
      !validId(siteId) || !accessToken || accessToken.length < 32) return { mode: "error" }
  return { mode: "mongodb", uri, database, organizationId: organizationId!, siteId: siteId!, accessToken }
}
