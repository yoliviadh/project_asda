import "server-only"
import type { MonitoringConfig } from "./config"
import { monitoringCollections } from "./db"
import { assetSchema, sensorSchema, telemetrySchema, scopeSchema } from "./models"
import type { MonitoringSnapshot, Reading } from "./contracts"

type LiveConfig = Extract<MonitoringConfig, { mode: "mongodb" }>
const MAX_SENSORS = 48
const MAX_HISTORY = 300
const queryOptions = { maxTimeMS: 5000 }

/** Scope comes only from trusted server configuration, never from query parameters. */
export async function readMonitoringSnapshot(config: LiveConfig, now = new Date()): Promise<MonitoringSnapshot> {
  const scope = scopeSchema.parse(config)
  const { assets, sensors, telemetry } = await monitoringCollections(config)
  const documents = await sensors.find(scope, queryOptions).sort({ id: 1 }).limit(MAX_SENSORS + 1).toArray()
  const views = await Promise.all(documents.slice(0, MAX_SENSORS).map(async document => {
    const sensor = sensorSchema.parse(document)
    const assetDocument = await assets.findOne({ ...scope, id: sensor.assetId }, queryOptions)
    if (!assetDocument) throw new Error("Sensor asset unavailable.")
    const asset = assetSchema.parse(assetDocument)
    const filter = { ...scope, sensorId: sensor.id }
    const [latestDocument, historyDocuments] = await Promise.all([
      telemetry.find(filter, queryOptions).sort({ observedAt: -1, eventId: -1 }).limit(1).next(),
      telemetry.find({ ...filter, observedAt: { $gte: new Date(now.getTime() - 86400_000), $lte: now } }, queryOptions)
        .sort({ observedAt: -1, eventId: -1 }).limit(MAX_HISTORY + 1).toArray(),
    ])
    const reading = (raw: unknown): Reading => {
      const t = telemetrySchema.parse(raw)
      if (t.assetId !== sensor.assetId || t.metric !== sensor.metric || t.unit !== sensor.unit) throw new Error("Inconsistent telemetry.")
      return { value: t.value, observedAt: t.observedAt.toISOString(), quality: t.quality }
    }
    return {
      sensor, assetName: asset.name, location: asset.location,
      latest: latestDocument ? reading(latestDocument) : null,
      history: historyDocuments.slice(0, MAX_HISTORY).reverse().map(reading),
      historyTruncated: historyDocuments.length > MAX_HISTORY,
    }
  }))
  return { source: "mongodb", generatedAt: now.toISOString(), siteName: config.siteId, sensors: views, sensorsTruncated: documents.length > MAX_SENSORS }
}
