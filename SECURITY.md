# Security Policy

## Reporting a vulnerability

Please email **security@codecloud.example** with details and a proof-of-concept.
We acknowledge within **2 business days** and aim to ship a fix or workaround
within **30 days** of confirmation. Do not file public issues for vulnerabilities.

## Scope

In scope:
- All apps under `artifacts/`
- All shared packages under `lib/`
- CI/build configuration that affects production artifacts

Out of scope:
- Reports against the local Replit dev environment
- Social engineering / physical attacks
- Denial-of-service via resource exhaustion against shared dev infra

## Security controls (foundation)

- **Secrets**: validated via `@platform/env` at boot; never logged (`@platform/logger`
  redacts password / token / secret / apiKey / authorization / cookie paths).
  Project secrets are encrypted at rest with AES-256-GCM via `@platform/secrets`.
- **Auth**: argon2id password hashing, double-submit CSRF cookies, session
  expiration enforced server-side (`@platform/auth`).
- **Database**: row-level security policies isolate tenants
  (`infra/db/rls.sql`); the `withTenant()` helper sets the per-transaction GUC.
- **Audit log**: every auth and secret access is written to the `audit_log`
  table by the `audit-log-writer` queue.
- **Compliance hooks**: `data_residency` column on tenants; DSAR export and
  delete tRPC procedures live behind the `dsar` feature flag.
- **Transport**: TLS terminated upstream; HSTS, CSP, X-Content-Type-Options,
  X-Frame-Options set by the API and web shell.

## Disclosure

We credit reporters in the changelog unless they prefer to remain anonymous.
