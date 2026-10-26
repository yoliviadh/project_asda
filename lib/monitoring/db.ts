import "server-only"
import { MongoClient } from "mongodb"
import type { MonitoringConfig } from "./config"
import type { Asset, Sensor, Telemetry } from "./models"

type LiveConfig = Extract<MonitoringConfig, { mode: "mongodb" }>
type Connection = { uri: string; promise: Promise<MongoClient> }
const shared = globalThis as typeof globalThis & { monitoringMongo?: Connection }

/** A bounded pool shared across requests and development hot reloads. */
export async function monitoringDb(config: LiveConfig) {
  if (shared.monitoringMongo && shared.monitoringMongo.uri !== config.uri) {
    throw new Error("Restart the server after changing MongoDB configuration.")
  }
  if (!shared.monitoringMongo) {
    const client = new MongoClient(config.uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      waitQueueTimeoutMS: 5000,
      // Do not allow URI options to disable certificate verification.
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
    })
    const connection: Connection = { uri: config.uri, promise: client.connect() }
    shared.monitoringMongo = connection
    connection.promise = connection.promise.catch(async () => {
      if (shared.monitoringMongo === connection) delete shared.monitoringMongo
      await client.close().catch(() => undefined)
      // Driver errors may contain hosts/credentials. Do not propagate them.
      throw new Error("MongoDB connection unavailable.")
    })
  }
  const client = await shared.monitoringMongo.promise
  return client.db(config.database)
}

export async function monitoringCollections(config: LiveConfig) {
  const db = await monitoringDb(config)
  return {
    assets: db.collection<Asset>("assets"),
    sensors: db.collection<Sensor>("sensors"),
    telemetry: db.collection<Telemetry>("telemetry_raw"),
  }
}

/** Explicit setup operation; reading the dashboard never creates indexes or data. */
export async function ensureMonitoringIndexes(config: LiveConfig) {
  const { assets, sensors, telemetry } = await monitoringCollections(config)
  await Promise.all([
    assets.createIndex({ organizationId: 1, siteId: 1, id: 1 }, { unique: true }),
    sensors.createIndex({ organizationId: 1, siteId: 1, id: 1 }, { unique: true }),
    sensors.createIndex({ organizationId: 1, siteId: 1, assetId: 1 }),
    telemetry.createIndex({ organizationId: 1, siteId: 1, sensorId: 1, eventId: 1 }, { unique: true }),
    telemetry.createIndex({ organizationId: 1, siteId: 1, sensorId: 1, observedAt: -1, eventId: -1 }),
  ])
}
