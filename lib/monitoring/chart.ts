import type { Reading } from "./contracts"

/** Split lines at bad samples and missing intervals instead of inventing continuity. */
export function chartSegments(readings: Reading[], maxGapMs: number): Reading[][] {
  const segments: Reading[][] = []
  let current: Reading[] = []
  for (const reading of readings) {
    if (reading.quality !== "good" || !Number.isFinite(reading.value) || !Number.isFinite(Date.parse(reading.observedAt))) {
      current = []
      continue
    }
    const previous = current.at(-1)
    if (previous && Date.parse(reading.observedAt) - Date.parse(previous.observedAt) > maxGapMs) current = []
    if (!current.length) segments.push(current)
    current.push(reading)
  }
  return segments
}
