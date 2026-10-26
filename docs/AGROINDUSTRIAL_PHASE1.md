# Agroindustrial monitoring — Phase 1

## Scope and entry points

`/` opens `/monitoring`, an independent sensor dashboard using the Community
Edition sidebar primitives, cards, tables, typography, themes and page components.
The existing ERP remains at `/dashboard`, with its original authentication and
workflows. Its Supabase dependencies remain only to preserve those legacy routes.
The new monitoring data layer uses MongoDB exclusively and imports no `ee/` or
`bignose/` code. No original ERP files or data are deleted.

The prototype includes sensor cards, observation freshness, threshold warnings,
a sensor-selectable 6/24-hour chart, an accessible data table and asset summary.
It refreshes on request; status is evaluated at the displayed snapshot time.
Times are explicitly displayed in UTC pending site timezone settings.

## Demo mode

Run `pnpm dev` and open `/monitoring`. MongoDB and Supabase are not required for
this route. With both MongoDB settings absent, `MONITORING_MODE=auto` selects
demo mode. `MONITORING_MODE=demo` explicitly selects it regardless of DB settings.

All demo readings are deterministic synthetic fixtures generated in memory.
They are labeled throughout the dashboard and are **never written to MongoDB**.
The sample includes healthy sensors, a moisture warning and an offline sensor.
Historical demo points are illustrative 30-minute samples, not ingested events.

## MongoDB configuration

Copy the relevant entries from `.env.monitoring.example` into an ignored
`.env.local`, or configure them in the deployment's secret manager:

| Variable | Purpose |
| --- | --- |
| `MONITORING_MODE` | `auto`, `demo`, or `mongodb` |
| `MONGODB_URI` | Private MongoDB connection string |
| `MONGODB_DATABASE` | Database name, e.g. `agroindustrial` |
| `MONITORING_ORGANIZATION_ID` | Trusted organization scope |
| `MONITORING_SITE_ID` | Trusted site scope |
| `MONITORING_ACCESS_TOKEN` | Random secret of at least 32 characters |

None of these variables uses a `NEXT_PUBLIC_` prefix. The connection module is
server-only, pools connections, bounds connection/queue/query timeouts, preserves
certificate verification and sanitizes failures. Use TLS for remote MongoDB and
a least-privilege account with read access for the read-only dashboard. Restart
the server when connection settings change.

Live data is protected with a temporary single-site HTTP Basic gate. The browser
prompts for username **monitor** and the access token as its password. Deploy
behind HTTPS; HTTP is suitable only for local development. This is a prototype
operator gate, not a multi-user login or role system. Add MongoDB-backed sessions
and memberships before opening access to multiple operators/sites. Credentials
are checked again in the server service, not just the proxy. Do not share-cache
authenticated monitoring pages or forward Authorization headers to other services.

Partial/invalid configuration displays a configuration error. Connection and
data-validation failures display an unavailable state. Neither silently falls
back to demo. A configured empty database displays an empty dashboard.

## Collections and initialization

Run `pnpm monitoring:init` with complete MongoDB configuration, using a setup
account allowed to create indexes. The command creates indexes only and never
inserts demo readings. Afterwards, use a read-only account for the dashboard.

Schemas live in `lib/monitoring/models.ts`:

- `assets`: scoped ID, name, kind, location, optional parent and scene-node IDs,
  creation/update dates and schema version.
- `sensors`: scoped ID, asset reference, metric/unit, enabled flag, expected
  sampling interval, warning bounds and schema version.
- `telemetry_raw`: scoped ID, sensor/asset reference, event ID, metric/unit,
  finite numeric value, observation/receipt dates, quality and schema version.

IDs use letters, digits, hyphens and underscores. Dates are BSON dates, not
strings. Required `schemaVersion` is `1`. MongoDB's internal `_id` is not exposed.
Supported initial metrics are temperature (`°C`), relative humidity (`%RH`),
grain moisture (`%`) and power demand (`kW`). Zod validates documents on reads;
these schemas must also be used by the future ingestion service. Database JSON
validators and write APIs are not part of this read-only prototype.

Unique indexes enforce scoped asset/sensor IDs and sensor event identities.
The telemetry query index orders by observation time and event ID, so delayed
arrival does not replace the latest observed reading. No retention deletion is
enabled. All queries use the server-configured organization and site; browser
input cannot change scope. The prototype displays up to 48 sensors and the most
recent 300 observations per sensor within 24 hours, with explicit truncation notices.
The latest reading is queried independently so older/offline sensors remain visible.

## Status and data quality

Online means the last observation is at most three expected sampling intervals
old; stale is up to ten intervals, and offline is older. Disabled and missing-data
states are separate. Invalid quality, invalid dates and timestamps more than one
minute in the future are flagged. Suspect values are not presented as valid KPI
measurements. Warning counts only include fresh, good-quality readings outside
configured limits. Missing values are never displayed as zero.

Chart lines break at invalid/suspect readings and missing sampling intervals.
Negative values and actual timestamp spacing are supported. A table provides
the underlying values and quality independently of the chart.

## Boundaries for later phases

Current flow: `demo fixture OR MongoDB repositories → server service → dashboard`.

Target flow: `sensors/gateway → validated ingestion → MongoDB raw telemetry →
processing worker → MongoDB processed metrics + XLSX artifact → dashboard/twin`.

`lib/monitoring/contracts.ts` defines processing requests, processed metrics and
twin observations without introducing a worker or simulated physical model.
Future Excel processing should version calculations, retain source-event lineage,
store processed results in MongoDB, and store generated XLSX files in GridFS.
Workbook libraries do not automatically evaluate Excel formulas. Do not make
XLSX generation or full history scans part of dashboard requests.

Next work: device credentials and validated/idempotent ingestion; MongoDB user
sessions and site access; server-side downsampling/pagination; processing jobs;
XLSX export; and a real asset-to-scene mapping. No complete Digital Twin simulation,
device actuation, automatic seeding or write endpoint is implemented here.

## Verification

```sh
pnpm typecheck
pnpm test:monitoring
pnpm build
pnpm e2e:monitoring
```

The browser suite uses the production build on port 3210 in explicit demo mode
and port 3211 with test-only credentials and an intentionally unavailable local
MongoDB endpoint. It checks authentication and failure states without accessing
any real database.
Install Playwright Chromium normally, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable.
Unit tests cover model validation, source selection, access checks, query scoping,
error redaction, freshness and chart gaps. They do not prove connectivity to an
external MongoDB deployment; that requires a configured instance.
