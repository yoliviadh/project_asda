import { headers } from "next/headers"
import { AlertTriangle } from "lucide-react"
import { loadMonitoring } from "@/lib/monitoring/service"
import { MonitoringDashboard } from "@/components/monitoring/dashboard"
import { RefreshButton } from "@/components/monitoring/refresh-button"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function MonitoringPage() {
  const result = await loadMonitoring((await headers()).get("authorization"))
  if (result.ok) return <MonitoringDashboard snapshot={result.snapshot} />
  const messages = {
    configuration: "Monitoring is not configured completely. Check the server configuration described in docs/AGROINDUSTRIAL_PHASE1.md. No readings were loaded.",
    unauthorized: "Access to stored readings requires monitoring operator authentication.",
    unavailable: "Stored readings could not be loaded. Check the MongoDB connection and data configuration, then retry. Demo data has not been substituted.",
  }
  return <div className="space-y-6"><PageHeader title="Sensor monitoring"><RefreshButton /></PageHeader>
    <Alert variant="destructive"><AlertTriangle /><AlertTitle>{result.reason === "unavailable" ? "Sensor data unavailable" : "Monitoring unavailable"}</AlertTitle><AlertDescription>{messages[result.reason]}</AlertDescription></Alert>
  </div>
}
