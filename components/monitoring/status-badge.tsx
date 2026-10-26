import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SensorStatus } from "@/lib/monitoring/status"

const display: Record<SensorStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  stale: { label: "Stale", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  offline: { label: "Offline", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  "no-data": { label: "No data", color: "bg-muted text-muted-foreground" },
  disabled: { label: "Disabled", color: "bg-muted text-muted-foreground" },
  invalid: { label: "Invalid reading", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
}

export function SensorStatusBadge({ status }: { status: SensorStatus }) {
  const { label, color } = display[status]
  return <Badge variant="outline" className={cn("gap-1.5 border-transparent", color)}>
    <span aria-hidden className="size-1.5 rounded-full bg-current" />{label}
  </Badge>
}
