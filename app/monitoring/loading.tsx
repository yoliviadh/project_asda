import { Skeleton } from "@/components/ui/skeleton"

export default function MonitoringLoading() {
  return <div role="status" aria-label="Loading sensor readings" className="space-y-6">
    <Skeleton className="h-9 w-64" />
    <Skeleton className="h-20 w-full" />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-32" />)}</div>
    <Skeleton className="h-80 w-full" />
    <span className="sr-only">Loading sensor readings…</span>
  </div>
}
