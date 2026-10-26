# Hosted Supabase setup (Community)

The app's existing Supabase clients can connect to Supabase Cloud. Docker is not
required for application development or for pushing existing SQL migrations.
This guide describes manual setup; no hosted project, credentials, or remote
database changes were created or tested during the font fix.

## 1. Create and configure the Cloud project

Create a dedicated Supabase project in your account. Keep its database password
in your password manager. The repository's local database configuration targets
Postgres 15; check compatibility if the Cloud project uses a newer major version.
Enable the Data API with the `public` schema exposed. Keep the `private` schema
unexposed and preserve the migrations' RLS policies and grants.

Allow HTTPS access from the app environment to your project's Supabase API host.
The migration machine also needs Supabase management API access and PostgreSQL
connectivity to the project's direct connection or session pooler. An HTTP proxy
alone may not provide the required PostgreSQL TCP access; if blocked, run the CLI
from your workstation or CI with permitted connectivity.

## 2. Apply the migrations

From the repository root, with dependencies installed, authenticate the Supabase
CLI in your own terminal, then run:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db push --linked
pnpm exec supabase migration list --linked
```

Use the CLI's secure prompts or your CI secret store for authentication and the
database password. These are deployment credentials, not application variables.
Review the target project and dry run before the write. Prefer a fresh project;
for an existing database, back it up and reconcile its migration history first.

Apply **all 78 migrations** in `supabase/migrations`, in filename order, from
`20260630090000_init_schema.sql` through
`20261026122000_document_content_identity.sql`. The CLI tracks applied versions.
They set up tables, functions, triggers, grants, RLS, first-workspace onboarding,
and the private `record-attachments` Storage bucket (10 MiB limit and restricted
file types). Do not manually create that bucket before applying its migration.
Verify the bucket and its object access policies after migration.

Do not run `db reset`, include the demo seed, or use `local:up`, `local:migrate`,
or `local:serve` against this workflow. Community does not need the separate Pro
provisioning SQL under `ee/`. No migration has been executed against Cloud here.

## 3. Set application environment variables

Supply these through your deployment environment, or an ignored `.env.local`
for local development. Do not commit values or paste secrets into chat.

| Variable | Value / purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL from the Supabase dashboard. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project public `anon` API key; safe for browser use. |
| `SUPABASE_SERVICE_ROLE_KEY` | Project `service_role` API key, server-only; used by privileged operations and bypasses RLS. Never use it as the public key. |
| `NEXT_PUBLIC_APP_URL` | Exact app origin, with no trailing slash; for example your HTTPS deployment origin or `http://localhost:3000` for development. Required for working signup confirmation links. |
| `BBN_EDITION` | `community` (also the default). |

The existing variable names above match the repository's clients. No application
`DATABASE_URL` is required: runtime access uses Supabase's HTTPS APIs. Set values
before building and starting; rebuild when changing public values because some
client reads use build-time fallbacks, even though public Supabase settings are
also delivered at runtime.

Set `CRON_SECRET` before enabling scheduled jobs, and `N8N_WEBHOOK_SECRET` before
enabling inbound n8n webhooks. Unset secrets cause those endpoints to reject
requests; they are not prerequisites for ordinary sign-in. Configure your external
scheduler for the desired `/api/cron/followups`, `/api/cron/outbox`,
`/api/cron/subscriptions`, and `/api/cron/replenishment` routes with the
`X-Cron-Secret` header. Migrations do not configure an external scheduler.

`N8N_OUTBOUND_URL`, `N8N_OUTBOUND_SECRET`, `OPENROUTER_API_KEY`,
`OPENROUTER_MODEL`, `RESEND_API_KEY`, and `EMAIL_FROM` are optional integrations.
Leave `NEXT_PUBLIC_DEMO_LOGIN_EMAIL` and `NEXT_PUBLIC_DEMO_LOGIN_PASSWORD` unset
for a real deployment. No credentials need to be generated for the font change.

## 4. Configure hosted authentication

`supabase/config.toml` describes the local stack; pushing database migrations does
not apply its Auth settings to Cloud. Configure these in the Cloud dashboard:

- Enable email/password sign-in and user signups for initial onboarding.
- Enable email confirmation for hosted users and configure custom SMTP for
  reliable delivery beyond Supabase's restricted default email service. This is
  separate from the optional Resend integration used for business documents.
- Set Site URL to `NEXT_PUBLIC_APP_URL`. Allow the exact
  `NEXT_PUBLIC_APP_URL/auth/confirm` redirect URL. Add the corresponding localhost
  callback only when using local development with this hosted project.
- Match the app's password policy: at least 10 characters, including lowercase,
  uppercase, and a digit.
- Ensure the confirmation email reaches `/auth/confirm` with either a PKCE
  `code` or `token_hash` and `type=signup`. The callback supports both. For an
  explicit token-hash Confirm signup template, the link can be
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
  The default PKCE confirmation flow uses the redirect supplied by the app;
  test the complete email flow after configuring URLs.

## 5. Start and verify

Run `pnpm dev` for development, or `pnpm build` followed by `pnpm start` for
production. In this managed environment, prefix pnpm commands with
`XDG_DATA_HOME=/workspace/.cache/data XDG_CACHE_HOME=/workspace/.cache/cache`
if the default home cache is read-only. Use the ordinary app commands, not the
Docker-oriented `local:*` wrappers.

Visit `/signup`, confirm the email, and create the first workspace through
`/onboarding`. Community permits one workspace per installation; additional
members join by invitation. Verify sign-in/sign-out, a persisted business record,
and an allowed attachment upload/download. These hosted integration checks remain
pending until you configure the project and credentials.
