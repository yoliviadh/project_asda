import type { Metric, Sensor } from "./models"

export type Reading = { value: number; observedAt: string; quality: "good" | "suspect" | "invalid" }
export type SensorView = {
  sensor: Sensor
  assetName: string
  location: string
  latest: Reading | null
  history: Reading[]
  historyTruncated: boolean
}
export type MonitoringSnapshot = {
  source: "demo" | "mongodb"
  generatedAt: string
  siteName: string
  sensors: SensorView[]
  sensorsTruncated: boolean
}

/** Boundary for a future worker. XLSX generation is intentionally not implemented. */
export type ProcessingRequest = {
  organizationId: string
  siteId: string
  sensorIds: string[]
  from: string
  to: string
  profileVersion: string
}
export type ProcessedMetric = {
  jobId: string
  sensorId: string
  metric: Metric
  value: number
  unit: string
  observedAt: string
  sourceEventIds: string[]
}
export type TwinObservation = {
  assetId: string
  sceneNodeId?: string
  readings: { sensorId: string; metric: Metric; reading: Reading | null }[]
}
