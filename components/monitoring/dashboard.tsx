import { Activity, AlertTriangle, Database, Droplets, FlaskConical, Radio, Shapes, Thermometer, Zap } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sensorCondition, sensorStatus } from "@/lib/monitoring/status"
import type { MonitoringSnapshot } from "@/lib/monitoring/contracts"
import { HistoryChart } from "./history-chart"
import { SensorStatusBadge } from "./status-badge"
import { RefreshButton } from "./refresh-button"

const icons = { temperature: Thermometer, humidity: Droplets, moisture: Droplets, power: Zap }
const stamp = (value: string) => value.replace("T", " ").slice(0, 19) + " UTC"

export function MonitoringDashboard({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const now = new Date(snapshot.generatedAt)
  const online = snapshot.sensors.filter(view => sensorStatus(view.sensor, view.latest, now) === "online").length
  const warnings = snapshot.sensors.filter(view => sensorStatus(view.sensor, view.latest, now) === "online" && sensorCondition(view.sensor, view.latest) === "warning").length
  const assets = new Map(snapshot.sensors.map(view => [view.sensor.assetId, view]))

  return <div className="space-y-6">
    <PageHeader title="Sensor monitoring" description={`${snapshot.siteName} · environmental and process observations`}><RefreshButton /></PageHeader>
    <Alert className={snapshot.source === "demo" ? "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30" : ""}>
      {snapshot.source === "demo" ? <FlaskConical /> : <Database />}
      <AlertTitle>{snapshot.source === "demo" ? "Demo mode — synthetic sensor data" : "MongoDB mode — stored sensor observations"}</AlertTitle>
      <AlertDescription>{snapshot.source === "demo"
        ? "All readings and status examples are generated in memory for this prototype. No sensor is connected and no demo reading has been saved to MongoDB."
        : "Read-only data from the configured site. An empty database stays empty; demo readings are never substituted for missing or unavailable records."}</AlertDescription>
    </Alert>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Monitored sensors" value={String(snapshot.sensors.length)} icon={Radio} hint="In the current site view" />
      <StatCard label="Online sensors" value={`${online} / ${snapshot.sensors.length}`} icon={Activity} tone="positive" hint="Based on observation freshness" />
      <StatCard label="Threshold warnings" value={String(warnings)} icon={AlertTriangle} tone={warnings ? "warning" : "default"} hint="Fresh, valid readings outside limits" />
      <StatCard label="Monitored assets" value={String(assets.size)} icon={Shapes} hint="Assets with registered sensors" />
    </div>
    <section id="sensors" aria-labelledby="sensors-title" className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="sensors-title" className="text-lg font-semibold">Sensor readings</h2><p className="text-xs text-muted-foreground">Snapshot: {stamp(snapshot.generatedAt)} · refresh manually</p></div>
      {!snapshot.sensors.length ? <EmptyState icon={Radio} title="No sensors registered" description="Register assets and sensors in the configured MongoDB site to begin monitoring. This prototype does not seed or ingest data automatically." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.sensors.map(view => {
          const { sensor, latest } = view
          const Icon = icons[sensor.metric]
          const status = sensorStatus(sensor, latest, now)
          const condition = sensorCondition(sensor, latest)
          const usable = latest && latest.quality === "good" && status !== "invalid"
          return <Card key={sensor.id} data-testid="sensor-card" className="gap-4">
            <CardHeader><div className="flex items-start justify-between gap-2"><Icon className="size-5 text-muted-foreground" /><SensorStatusBadge status={status} /></div>
              <CardTitle className="mt-2 text-base">{sensor.name}</CardTitle><CardDescription>{view.assetName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-semibold tracking-tight">{usable ? latest.value.toFixed(1) : "—"}<span className="ml-1 text-sm font-normal text-muted-foreground">{sensor.unit}</span></div>
              {status === "online" && condition === "warning" ? <Badge className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" variant="outline">Outside warning range</Badge>
                : <p className="text-xs text-muted-foreground">{status !== "online" ? "No current valid reading" : condition === "unknown" ? "Check reading quality" : sensor.warningMin === undefined && sensor.warningMax === undefined ? "No warning limits configured" : "Within configured limits"}</p>}
              <p className="text-xs text-muted-foreground">{latest ? `${status === "online" ? "Observed" : "Last observed"}: ${stamp(latest.observedAt)}` : "Awaiting first observation"}</p>
              <p className="text-xs text-muted-foreground">{snapshot.source === "demo" ? "Demo" : "Stored"} · {sensor.id}{latest ? ` · quality: ${latest.quality}` : ""}</p>
            </CardContent>
          </Card>
        })}
      </div>}
    </section>
    {snapshot.sensorsTruncated && <p className="text-sm text-amber-700 dark:text-amber-300">Prototype view limited to the first 48 sensors. Counts describe only the displayed sensors.</p>}
    <HistoryChart snapshot={snapshot} />
    <Card id="assets" className="scroll-mt-20">
      <CardHeader><CardTitle>Asset overview</CardTitle><CardDescription>Physical assets linked to the displayed sensors</CardDescription></CardHeader>
      <CardContent><Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Location</TableHead><TableHead>Sensors</TableHead><TableHead>Data source</TableHead></TableRow></TableHeader>
        <TableBody>{[...assets].map(([id, view]) => <TableRow key={id}><TableCell><span className="font-medium">{view.assetName}</span><span className="block text-xs text-muted-foreground">{id}</span></TableCell><TableCell>{view.location}</TableCell><TableCell>{snapshot.sensors.filter(row => row.sensor.assetId === id).length}</TableCell><TableCell><Badge variant="secondary">{snapshot.source === "demo" ? "Demo" : "MongoDB"}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>{!assets.size && <p className="py-4 text-sm text-muted-foreground">No monitored assets yet.</p>}</CardContent>
    </Card>
  </div>
}
