# CodeCloud — Cloud IDE Platform

## Overview

CodeCloud is a browser-based cloud IDE platform designed to provide a comprehensive development environment. It enables users to create, edit, run, and deploy code directly from their web browser, supporting multiple programming languages and frameworks through a template-driven project creation system. The platform aims to offer a seamless, collaborative, and efficient cloud-native development experience, featuring a robust code editor, file management, an integrated terminal, live previews, and one-click deployment.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and performance. For architectural decisions, provide a brief justification for the chosen approach. I expect iterative development with clear steps. Please ask for confirmation before implementing significant changes or refactoring large portions of the codebase. Do not make changes to the `artifacts/mockup-sandbox` folder. User speaks Hebrew primarily.

## System Architecture

The project is structured as a pnpm monorepo using TypeScript, with distinct artifacts for the API server, client-side IDE, and shared libraries.

**UI/UX Decisions:**
The frontend uses React 19, Vite, and Tailwind CSS v4, providing a responsive and modern interface. The IDE includes a Monaco editor, resizable panels, a customizable dark theme, multi-file search, resource monitoring, a fully-featured terminal (xterm.js), collaborative cursors, file breadcrumbs, split-editor view, image and Markdown previews, and integrated Git and environment variable editors. Layout persistence is managed per project using local storage.

**Technical Implementations:**
- **API Server:** An Express 5 REST API manages all backend operations (322 route files).
- **Database:** PostgreSQL is used with Drizzle ORM (62 schema files).
- **Authentication:** Clerk handles user management, supplemented by JWT for API client authentication. OAuth integrations for Google and GitHub are supported. Custom `requireAuth` middleware integrates Clerk sessions with internal user profiles. 2FA/TOTP with hashed backup codes (`otpauth`). SAML/SSO with SP metadata + ACS endpoints.
- **Validation:** Zod is used extensively for API request body validation.
- **API Codegen:** Orval generates React Query hooks and Zod schemas from an OpenAPI specification, ensuring type safety and consistency between frontend and backend.
- **WebSocket:** A dedicated WebSocket server (`/ws`) supports real-time features like terminal interaction, collaboration, notifications, and deployment logs, utilizing Socket.IO and Yjs CRDT. Features connection pooling, heartbeat mechanisms, and channel-based pub/sub.
- **Security:** Helmet, CORS, and `express-rate-limit` middlewares. Plan-tiered rate limits (free/pro=2x/team=5x). AES-256-GCM encryption for secrets. Boot-time secret validation (fail-fast in production). Active session tracking with device detection, login history, auto-audit middleware (body-less), brute-force lockout, API key scoping (read/write/admin), IP allowlisting, and org-level RBAC policies. Security Center UI at `/security` with 4 tabs.
- **AI Gateway:** 38 AI models from 25 providers (OpenAI, Anthropic, Google, xAI, DeepSeek, Meta, Mistral, Qwen, Cohere, Ollama, Perplexity, AI21, Together, Fireworks, Cerebras, Inflection, Zhipu, MiniMax, Moonshot, Yi, SambaNova, NVIDIA, Amazon, Azure, Baichuan). Smart AI Router auto-selects optimal model by task/cost/speed. AI Benchmark system. BYOK support. AI chat conversations within projects.
- **Credits & Billing:** Stripe integration, credit rollover (pro: 100, team: 300), on-demand top-ups, metered billing, usage tracking.
- **SCIM v2:** Enterprise SSO user provisioning (Users CRUD, ServiceProviderConfig, ResourceTypes, Schemas).
- **Design Templates:** 18 ready-to-deploy templates across 12 categories (SaaS, e-commerce, AI, mobile, etc.)
- **Design System:** Full design tokens (colors, typography, spacing, radii, shadows, animations), export to CSS/Tailwind/SCSS/Figma.
- **Real-Time Collaboration:** Socket.IO and Yjs CRDT for multiplayer editing with presence tracking, terminal sharing, and follow mode. Frontend hooks: `useSocketIO` (connection mgmt), `useYjsCollaboration` (CRDT editing). `PresenceBar` component shows live collaborators in IDE header.
- **Container/Deployment:** Container engine (simulated UI-only terminal/status), GPU support, blue-green deployments, canary analysis, geo-routing, CDN cache, multi-region, edge deploy, warm pools, autoscale (CPU/Memory/RPS), static site deployments.
- **BaaS:** Backend-as-a-Service with database, auth, storage, edge functions, realtime, webhooks.
- **MCP Integration:** 5 built-in MCP servers (Filesystem, Database, Git, Browser, Terminal) + custom server support.
- **White-Label:** Enterprise custom branding (logo, colors, domain, emails, SEO).
- **Publishing Controls:** Approval workflows, environments (production/staging/preview), rollback, pre-publish checks.
- **Sharing Controls:** Public/private/internal/unlisted visibility, share links, embed codes.
- **Knowledge Base:** Custom AI context documents, URL import, token-tracked (100K limit).
- **RBAC:** 5 system roles + custom role creation with granular permission matrix.
- **Internal Publish:** Private deployments for team/org only with IP restrictions and password protection.
- **DevOps:** CI/CD pipeline, build cache, coverage, linting, vulnerability scanning, auto-rollback. Automated testing on deploy: configurable per-project test commands run before deployment, blocking deployment if tests fail.
- **i18n:** 134+ language support with RTL.
- **Middleware Stack:** Includes `requestId` for correlation IDs, `requestLogger` for structured logging, `responseTime` header, `noSniff` for content security, and `auditMiddleware`.
- **Background Jobs:** Asynchronous tasks like container cleanup, metrics collection, email processing, token cleanup, and deployment health checks.
- **Authorization:** `requireProjectAccess(role)` middleware enforces access control based on user roles and project ownership/collaboration, including IDOR prevention.
- **Issue Tracker:** Project-level issue tracking with status (open/in-progress/closed), labels (bug/feature/improvement), assignee from collaborators, code references (file+line), and threaded comments. API at `/projects/:id/issues`.
- **Project & Organization Management:** Create, list, fork, export, and delete projects. Manage files, collaborators, deployments, and secrets per project. Create and manage organizations, members, invites, and shared secrets.
- **IDE Tools (Tasks 251-281):** Docker image builder/analyzer, rate limit dashboard, performance auditing (Lighthouse), dependency license checker (SBOM), collaborative TODO list, traffic analytics dashboard, command exec history (with export), coding time tracking & streaks, badge generator, environment comparison (dev/staging/prod), container networking dashboard, multi-region deployment selector, cost optimizer, container debug inspector (processes/fs/network/env/resources), layout presets, regex code search, deploy monitoring alerts, automated security patching, image vulnerability scanner, project embed widget configurator, smart terminal with autocomplete, project documentation wiki (versioned pages), platform status/incidents page, RSS changelog feeds, social sharing cards (OG meta), template versioning, auto-documentation from TypeScript types.
- **Platform Services (288+ services):** Includes container engine, GitHub integration, notification system, explore/social, team management, activity feed, usage limits, webhooks, user onboarding, feature flags, support tickets, cloud functions, scheduled tasks, edge config, database backups, log streaming, API keys, search index, email service, SSO providers, IP filtering, session management, GDPR compliance, deployment strategies (blue-green/canary/rolling), platform metrics, GraphQL API, CLI tools, project archival, object storage, service mesh, learning paths, hackathons, workspace-sync, code-review-ai, container-snapshots, live-share, project-import, project-export, container-logs, user-preferences, build-cache, custom-runners, project-templates-store, debug-sessions, project-variables, resource-limits, project-badges, deploy-rollback, project-forks, code-formatting, project-milestones, user-activity-log.

## Stats
- 322 API route files
- 67 frontend pages
- 62 DB schema files

## Key Routes (Recent Additions)
- `/api/autoscale/:projectId/*` — Autoscale policies (min/max replicas, strategies)
- `/api/static-deploy/:projectId/*` — Static site deployments (10 frameworks, CDN)
- `/api/baas/:projectId/*` — Backend-as-a-Service (DB, Auth, Storage, Functions)
- `/api/mcp/:projectId/*` — MCP tool integration (servers, tools, execution)
- `/api/white-label/:orgId/*` — White-label branding & domain
- `/api/internal-publish/:projectId/*` — Internal/private deployments
- `/api/design-tokens/:projectId/*` — Design system tokens & export
- `/api/sharing/:projectId/*` — Visibility & sharing controls
- `/api/publishing/:projectId/*` — Publishing controls & approval workflow
- `/api/knowledge/:projectId/*` — Knowledge base documents & context
- `/api/ai/models` — 38 AI models from 23 providers
- `/api/ai/smart-route` — Smart AI routing
- `/api/ai/benchmark` — AI model benchmark leaderboard
- `/api/credits/*` — Credit balance, topup, rollover, history
- `/api/scim/v2/*` — SCIM v2 user provisioning
- `/api/design-templates` — Template marketplace
- `/api/security/*` — 2FA, sessions, login history
- `/projects/:id/issues` — Issue tracking API

## Frontend Pages (Recent Additions)
- `/autoscale` — Autoscale configuration UI
- `/static-deploy` — Static site deployments UI
- `/baas` — Backend-as-a-Service dashboard
- `/mcp-tools` — MCP server & tool management
- `/white-label` — Enterprise branding configuration
- `/rbac` — Role & permission management
- `/design-tokens` — Design system tokens editor
- `/sharing` — Visibility & sharing controls
- `/publishing` — Publishing controls & approval workflow
- `/knowledge-base` — Knowledge base document management
- `/ai-models` — AI Model Marketplace with search, filter, compare, smart recommend
- `/differentiators` — 20 differentiator features
- `/security` — Security Center (2FA, sessions, login history)
- `/pricing` — 4-tier pricing page
- `/billing` — Billing dashboard
- `/ai-chat` — AI chat conversations
- `/integrations` — Marketplace for third-party integrations
- `/wiki` — Project documentation wiki
- `/status` — Platform status/incidents page
- `/changelog` — Platform changelog feed
- `/compliance` — Compliance dashboard
- `/onboarding` — User onboarding flow
- `/admin` — Admin panel for platform management
- `/explore` — Social exploration feed
- `/teams` — Team management
- `/domains` — Custom domain management
- `/webhooks` — Webhook management
- `/support` — Support ticket system
- `/snippets` — Code snippets library
- `/error-dashboard` — Platform error monitoring
- `/funnel-dashboard` — User funnel analytics
- `/revenue-analytics` — Platform revenue tracking
- `/image-registry` — Container image registry
- `/code-metrics` — Code quality and metrics
- `/container-health` — Container health monitoring
- `/live-session` — Real-time collaboration sessions
- `/developer-settings` — Developer API and app settings
- `/template-store` — Project template marketplace
- `/error-tracking` — Per-project error tracking

## DB Schemas Added (Recent)
- `db_sync_logs`, `todos`, `exec_history`, `wiki_pages`, `wiki_page_versions`, `coding_stats`, `coding_streaks`, `incidents`, `incident_updates`, `milestones`, `milestone_tasks`, `issues` (with JSONB code references).
- `two-factor-secrets`, `sso-configurations`, `user-sessions`, `org-policies`, `login-history`, `ip-allowlist`.


## External Dependencies

- **Auth:** Clerk (`@clerk/express`, `@clerk/react`), TOTP (`otpauth`, `qrcode`)
- **Database:** PostgreSQL (via Drizzle ORM)
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Terminal:** xterm.js
- **Frontend Framework:** React 19
- **Build Tool:** Vite, esbuild
- **Styling:** Tailwind CSS v4
- **Routing:** wouter
- **State Management:** Zustand
- **Validation:** Zod, `drizzle-zod`
- **WebSockets:** Socket.IO (`socket.io`, `socket.io-client`)
- **Real-Time Collaboration:** Yjs CRDT (`yjs`, `y-monaco`)
- **Security:** `helmet`, `cors`, `express-rate-limit`, `ua-parser-js`
- **Payments:** Stripe (`stripe`)
