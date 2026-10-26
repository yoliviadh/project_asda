import { loadEnvConfig } from "@next/env"
import { monitoringConfig } from "../lib/monitoring/config"
import { ensureMonitoringIndexes } from "../lib/monitoring/db"

async function main() {
  loadEnvConfig(process.cwd())
  const config = monitoringConfig()
  if (config.mode !== "mongodb") {
    console.error("Complete MongoDB monitoring configuration is required. See docs/AGROINDUSTRIAL_PHASE1.md.")
    process.exit(1)
  }
  try {
    await ensureMonitoringIndexes(config)
    console.log("Monitoring collection indexes are ready. No demo records were inserted.")
    process.exit(0)
  } catch {
    console.error("MongoDB setup failed. Check connectivity, configuration, permissions and existing duplicate records.")
    process.exit(1)
  }
}
void main()
