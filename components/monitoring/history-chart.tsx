"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MonitoringSnapshot } from "@/lib/monitoring/contracts"
import { chartSegments } from "@/lib/monitoring/chart"

const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" }).format(new Date(value))

export function HistoryChart({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const [selectedId, setSelectedId] = useState(snapshot.sensors[0]?.sensor.id ?? "")
  const [hours, setHours] = useState(24)
  const selected = snapshot.sensors.find(view => view.sensor.id === selectedId) ?? snapshot.sensors[0]
  const end = Date.parse(snapshot.generatedAt)
  const start = end - hours * 3600_000
  const readings = selected?.history.filter(row => Date.parse(row.observedAt) >= start && Date.parse(row.observedAt) <= end) ?? []
  const good = readings.filter(row => row.quality === "good")
  const min = good.length ? Math.min(...good.map(row => row.value)) : 0
  const max = good.length ? Math.max(...good.map(row => row.value)) : 1
  const pad = Math.max((max - min) * 0.2, 0.5)
  const low = min - pad
  const high = max + pad
  const x = (stamp: string) => 60 + (Date.parse(stamp) - start) / (end - start) * 800
  const y = (value: number) => 220 - (value - low) / (high - low) * 180
  // Demo snapshots use 30-minute illustrative intervals, independently of device cadence.
  const maxGap = snapshot.source === "demo" ? 45 * 60_000 : (selected?.sensor.samplingIntervalSeconds ?? 300) * 3000
  const segments = chartSegments(readings, maxGap)

  return <Card id="history" className="scroll-mt-20">
    <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1"><CardTitle>Historical trends</CardTitle>
        <CardDescription>{snapshot.source === "demo" ? "Illustrative demo history" : "Stored observations"} · last {hours} hours · UTC</CardDescription>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="history-sensor">Chart sensor</label>
        <select id="history-sensor" value={selected?.sensor.id ?? ""} onChange={event => setSelectedId(event.target.value)} className="h-9 max-w-full rounded-md border bg-background px-2 text-sm">
          {snapshot.sensors.map(({ sensor }) => <option key={sensor.id} value={sensor.id}>{sensor.name}</option>)}
        </select>
        <div className="flex gap-1" aria-label="Chart time range">
          {[6, 24].map(value => <Button key={value} size="sm" variant={hours === value ? "secondary" : "ghost"} aria-pressed={hours === value} onClick={() => setHours(value)}>{value}h</Button>)}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {!good.length ? <EmptyState title="No valid history in this range" description="Readings will appear after valid observations are available." /> : <>
        <div className="mb-2 flex items-center gap-2 text-sm"><span className="size-2 rounded-full bg-primary" aria-hidden /><span>{selected.sensor.name} ({selected.sensor.unit})</span></div>
        <figure aria-label={`${selected.sensor.name} history in ${selected.sensor.unit}`}>
          <svg viewBox="0 0 900 265" role="img" aria-label={`${selected.sensor.name}: minimum ${min.toFixed(1)}, maximum ${max.toFixed(1)} ${selected.sensor.unit}. See data table below.`} className="h-64 w-full text-primary">
            {[0, 1, 2, 3, 4].map(index => {
              const value = low + (high - low) * index / 4
              return <g key={index}>
                <line x1="60" x2="860" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.1" />
                <text x="48" y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="11">{value.toFixed(1)}</text>
              </g>
            })}
            {segments.map((segment, index) => <g key={index}>
              <polyline points={segment.map(row => `${x(row.observedAt)},${y(row.value)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {segment.map((row, i) => <circle key={`${row.observedAt}-${i}`} cx={x(row.observedAt)} cy={y(row.value)} r="2.5" fill="currentColor"><title>{`${time(row.observedAt)} UTC · ${row.value} ${selected.sensor.unit}`}</title></circle>)}
            </g>)}
            {[0, 1, 2, 3, 4].map(index => <text key={index} x={60 + index * 200} y="250" textAnchor="middle" fill="currentColor" fontSize="11">{time(new Date(start + (end - start) * index / 4).toISOString())}</text>)}
          </svg>
          <figcaption className="text-xs text-muted-foreground">{good.length} valid observations. Gaps and invalid samples are not interpolated. All times are UTC.</figcaption>
        </figure>
      </>}
      {selected?.historyTruncated && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Showing the most recent 300 observations; this may cover less than the selected time range.</p>}
      {!!readings.length && <details className="mt-4 rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">View chart data</summary>
        <div className="mt-3 max-h-64 overflow-auto"><Table>
          <TableHeader><TableRow><TableHead>Observed at (UTC)</TableHead><TableHead>Value ({selected.sensor.unit})</TableHead><TableHead>Quality</TableHead></TableRow></TableHeader>
          <TableBody>{readings.map((row, i) => <TableRow key={`${row.observedAt}-${i}`}><TableCell>{row.observedAt.replace("T", " ").slice(0, 19)}</TableCell><TableCell>{row.value.toFixed(1)}</TableCell><TableCell>{row.quality}</TableCell></TableRow>)}</TableBody>
        </Table></div>
      </details>}
    </CardContent>
  </Card>
}
