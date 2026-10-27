import { z } from "zod"

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/)
export const scopeSchema = z.object({ organizationId: id, siteId: id })
const base = scopeSchema.extend({ id, schemaVersion: z.literal(1) })
export const metricSchema = z.enum(["temperature", "humidity", "moisture", "power"])
export type Metric = z.infer<typeof metricSchema>
export const METRICS = {
  temperature: { label: "Temperature", unit: "°C" },
  humidity: { label: "Relative humidity", unit: "%RH" },
  moisture: { label: "Grain moisture", unit: "%" },
  power: { label: "Power demand", unit: "kW" },
} as const

export const assetSchema = base.extend({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["storage", "dryer", "processing_line", "environment"]),
  location: z.string().trim().min(1).max(160),
  parentId: id.optional(),
  // Future twin mapping; no simulation or geometry is required in Phase 1.
  sceneNodeId: id.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const sensorSchema = base.extend({
  assetId: id,
  name: z.string().trim().min(1).max(120),
  metric: metricSchema,
  unit: z.enum(["°C", "%RH", "%", "kW"]),
  enabled: z.boolean(),
  samplingIntervalSeconds: z.number().int().min(1).max(86400),
  warningMin: z.number().finite().optional(),
  warningMax: z.number().finite().optional(),
}).refine(s => s.unit === METRICS[s.metric].unit, "Unit does not match metric")
  .refine(s => s.warningMin === undefined || s.warningMax === undefined || s.warningMin < s.warningMax, "Invalid warning range")

export const telemetrySchema = base.extend({
  sensorId: id,
  assetId: id,
  eventId: id,
  metric: metricSchema,
  unit: z.enum(["°C", "%RH", "%", "kW"]),
  value: z.number().finite(),
  observedAt: z.date(),
  receivedAt: z.date(),
  quality: z.enum(["good", "suspect", "invalid"]),
}).refine(t => t.unit === METRICS[t.metric].unit, "Unit does not match metric")

export type Scope = z.infer<typeof scopeSchema>
export type Asset = z.infer<typeof assetSchema>
export type Sensor = z.infer<typeof sensorSchema>
export type Telemetry = z.infer<typeof telemetrySchema>
