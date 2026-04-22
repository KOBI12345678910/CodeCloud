# Platform Foundation

Production-grade monorepo that all flagship features (IDE Workspace, AI Agent,
Multi-AI Hub, Chat-to-Task billing, Deployments, Marketplace) build on top of.

## Architecture

```
                       ┌────────────────────────────────────────────┐
                       │                Cloudflare                  │
                       │     (CDN, WAF, TLS, edge cache)            │
                       └────────────────┬───────────────────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                │                                               │
        ┌───────▼────────┐                            ┌─────────▼────────┐
        │  Web shell     │   tRPC over HTTPS          │  API server      │
        │  (cloud-ide)   │ ─────────────────────────▶ │  (api-server)    │
        │  Vite + React  │ ◀───────────────────────── │  Express + tRPC  │
        └───────┬────────┘   OpenAPI / WS             └────┬────┬────────┘
                │                                          │    │
                │                                          │    │ enqueue
                │                                          │    ▼
                │                                          │  ┌────────────┐
                │                                          │  │  Worker    │
                │                                          │  │  (BullMQ)  │
                │                                          │  └─────┬──────┘
                │                                          │        │
                │                          ┌───────────────┴──────┐ │
                │                          │                      │ │
                ▼                          ▼                      ▼ ▼
         ┌────────────┐         ┌──────────────────┐      ┌──────────────────┐
         │  PostHog   │         │   PostgreSQL     │      │   Redis          │
         │ analytics  │         │   (RLS-isolated) │      │  (queues, cache) │
         └────────────┘         └──────────────────┘      └──────────────────┘
                                         │                       │
                                         ▼                       ▼
                                ┌──────────────────┐    ┌──────────────────┐
                                │  Meilisearch     │    │  MinIO (S3)      │
                                └──────────────────┘    └──────────────────┘

         All three apps emit OTLP traces ─▶ OTel collector ─▶ Prometheus / Tempo
         All three apps report errors    ─▶ Sentry
```

## Package map

| Package                       | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `@platform/tsconfig`          | Shared `tsconfig` presets (base / node / react)|
| `@platform/eslint-config`     | Shared ESLint flat config                      |
| `@platform/prettier-config`   | Shared Prettier config                         |
| `@platform/env`               | Zod-validated env loader                       |
| `@platform/logger`            | pino logger with secret redaction              |
| `@platform/telemetry`         | OTel + Sentry + PostHog + Prometheus helpers   |
| `@platform/db`                | Drizzle client + schema + RLS helper           |
| `@platform/auth`              | argon2id, CSRF double-submit, session helpers  |
| `@platform/queue`             | BullMQ wrapper + in-memory driver              |
| `@platform/i18n`              | ICU formatter + en/es/ja/ar locales            |
| `@platform/ui`                | Theme + `cn()` class merger                    |
| `@platform/trpc`              | Router/context/middleware primitives           |
| `@platform/secrets`           | Vault interface + Postgres impl                |
| `artifacts/cloud-ide`         | Web shell (existing IDE; React + Vite)         |
| `artifacts/api-server`        | HTTP API (existing Express server)             |
| `artifacts/api-trpc`          | Reference Fastify + tRPC + OpenAPI service using the foundation |
| `artifacts/worker`            | Background worker (BullMQ consumer)            |

## Local dev

Prereqs: Node 24, pnpm 9, Docker (for the supporting infra).

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis meilisearch minio otel-collector
pnpm --filter @workspace/db push   # apply Drizzle schema
psql "$DATABASE_URL" -f infra/db/rls.sql
pnpm --filter @workspace/db exec tsx ../../infra/db/seed.ts
pnpm dev
```

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` are
fanned out across every workspace by Turborepo (`turbo.json`).

## First 15 minutes (onboarding)

1. **Clone & install** (above).
2. Open `replit.md` for the full app-level catalog of routes, jobs, and IDE
   features that already exist in the cloud-ide / api-server artifacts.
3. Bring up the supporting infra with `docker compose up -d`.
4. Run `pnpm test` — every `@platform/*` package ships with at least a smoke test.
5. Run `pnpm dev` — the web shell, API, and worker boot together via Turbo.
6. Hit `http://localhost:8080/healthz` to confirm the API is alive.
7. Tail the worker logs and watch the boot self-test job appear in the
   `health` queue.
8. Open Grafana (if running) and import `infra/grafana/platform-overview.json`.

## Incident runbook (stub)

| Symptom                            | First action                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| 5xx spike on web or api            | Check Sentry → identify release → roll back via deployment revert workflow.  |
| Worker queue depth growing         | `redis-cli LLEN bull:health:wait`; scale worker replicas; pause producers.   |
| Postgres replication lag           | Check `pg_stat_replication`; failover to standby; restore from PITR base.    |
| Secret leak suspected in logs      | Rotate the affected key, run `@platform/logger` redaction test, audit log.   |
| Tenant data appearing cross-tenant | RLS policy is the contract — see `infra/db/rls.sql` and the RLS test suite. |

### Rollback

```bash
git revert <bad-sha>
pnpm build && docker compose up -d --build api worker web
```

### Queue drain

```bash
redis-cli FLUSHDB              # local dev only — wipes all queues
# or use the BullMQ dashboard to pause / drain a specific queue
```

### Database restore

```bash
pg_restore -d "$DATABASE_URL" /backups/platform-<date>.dump
psql "$DATABASE_URL" -f infra/db/rls.sql
```

## Compliance hooks

- `tenants.data_residency` (`us` / `eu` / `ap`) decides which region a tenant's
  data is stored in.
- DSAR export & delete are exposed as tRPC procedures behind the `dsar`
  feature flag (`feature_flags.key = 'dsar'`).
- Every auth event and secret access is appended to the `audit_log` table
  via the `audit-log-writer` queue.

## Security

See `SECURITY.md` for the disclosure process and the foundation-level controls.
