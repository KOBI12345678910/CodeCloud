# CodeCloud — Cloud IDE Platform

## Overview

CodeCloud is a browser-based cloud IDE platform designed to provide a comprehensive development environment similar to Replit. It enables users to create, edit, run, and deploy code directly from their web browser. The platform supports multiple programming languages and frameworks through a template-driven project creation system. Key features include a robust code editor, file management, an integrated terminal, live previews, and one-click deployment. The overarching vision is to offer a seamless, collaborative, and efficient cloud-native development experience.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and performance. For architectural decisions, provide a brief justification for the chosen approach. I expect iterative development with clear steps. Please ask for confirmation before implementing significant changes or refactoring large portions of the codebase. Do not make changes to the `artifacts/mockup-sandbox` folder.

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (via @clerk/express server-side, @clerk/react client-side) + JWT auth for API clients
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Markdown preview**: react-markdown + remark-gfm + rehype-highlight
- **Panels**: react-resizable-panels
- **Routing**: wouter
- **Build**: esbuild (API server CJS bundle)
- **Security**: helmet, cors, express-rate-limit, AES-256-GCM encryption

## System Architecture

The project is structured as a pnpm monorepo using TypeScript, with distinct artifacts for the API server, client-side IDE, and shared libraries.

**UI/UX Decisions:**
The frontend is built with React 19, Vite, and Tailwind CSS v4, focusing on a responsive and modern interface. The IDE features a Monaco editor, resizable panels, and a customizable theme with a default dark mode (`hsl(222 47% 11%)` background, accent blue `hsl(224 76% 48%)`). Key IDE components include multi-file search, resource monitoring, a fully-featured terminal (xterm.js), collaborative cursors, file breadcrumbs, split-editor view, image and Markdown previews, and integrated Git and environment variable editors. Layout persistence is managed per project using local storage.

**Technical Implementations:**
- **API Server:** An Express 5 REST API handling all backend operations.
- **Database:** PostgreSQL with Drizzle ORM.
- **Authentication:** Primarily handled by Clerk for user management, supplemented with JWT for API client authentication. Custom `requireAuth` middleware integrates Clerk sessions with internal user profiles. OAuth integrations for Google and GitHub are supported.
- **Validation:** Zod is used extensively for API request body validation.
- **API Codegen:** Orval generates React Query hooks and Zod schemas from an OpenAPI specification, ensuring type safety and consistency between frontend and backend.
- **WebSocket:** A dedicated WebSocket server (`/ws`) supports real-time features like terminal interaction, collaboration, notifications, and deployment logs, utilizing connection pooling, heartbeat mechanisms, and channel-based pub/sub.
- **Security:** Helmet, CORS, and `express-rate-limit` middlewares are implemented for security and abuse prevention. AES-256-GCM encryption is used for project secrets.
- **Middleware Stack:** Includes `requestId` for correlation IDs, `requestLogger` for structured logging, `responseTime` header, and `noSniff` for content security.
- **Background Jobs:** Asynchronous tasks like container cleanup, metrics collection, email processing, token cleanup, and deployment health checks are managed as background jobs.
- **Authorization:** `requireProjectAccess(role)` middleware enforces access control based on user roles and project ownership/collaboration, including IDOR prevention.
- **Container Simulation:** The platform currently simulates container execution (UI-only terminal and status indicators).
- **Email Service:** Template-based HTML emails are used for various user notifications and system messages.

### Database Tables (18+)
- `users` — Clerk-synced user profiles (plan, storage, role, passwordHash, authProvider, googleId)
- `projects` — User projects with language, container status, deploy URL, GPU enabled flag
- `files` — Project file tree (path, content, size, mime type)
- `templates` — Starter templates (12 seeded, includes TensorFlow/PyTorch GPU templates with CUDA versions)
- `collaborators` — Project collaborators with roles (viewer/editor/admin)
- `deployments` — Deployment history with version, status, subdomain
- `console_history` — Terminal/console output history
- `project_secrets` — AES-256-GCM encrypted environment variables per project
- `organizations` — Team/org management
- `org_members` — Organization membership with roles
- `file_versions` — File version history/snapshots
- `stars` — Project starring/favoriting
- `comments` — Project and file comments
- `ai_conversations` — AI chat conversations per project
- `audit_log` — Platform-wide audit trail
- `notifications` — User notifications
- `subscriptions` — Billing subscriptions
- `api_keys` — Developer API keys
- `usage_metrics` — Usage tracking and analytics
- `refresh_tokens` — JWT refresh token storage
- `container_metrics` — Container resource metrics (CPU, memory, disk, health status, restart count)
- `gpu_usage` — GPU allocation and metrics tracking per project (utilization, VRAM, temperature, power)
- `domains` — Custom domain management per project (SSL status, DNS verification)
- `project_integrations` — Third-party service integrations per project

**Feature Specifications:**
- **Project Management:** Create, list, fork, export, and delete projects. Manage files, collaborators, deployments, and secrets per project.
- **User Management:** User profiles, API keys, notifications, feedback, and billing subscriptions.
- **Organization Management:** Create and manage organizations, members, invites, and shared secrets.
- **AI Integration:** AI chat conversations within projects.
- **Integrations:** Marketplace for third-party integrations (e.g., Slack, Discord, Jira).
- **Always-On:** Configuration to keep projects continuously running.
- **Admin Panel:** Tools for managing users, projects, and auditing.
- **IDE Tools (Tasks 251-281):** Docker image builder/analyzer, rate limit dashboard, performance auditing (Lighthouse), dependency license checker (SBOM), collaborative TODO list, traffic analytics dashboard, command exec history (with export), coding time tracking & streaks, badge generator, environment comparison (dev/staging/prod), container networking dashboard, multi-region deployment selector, cost optimizer, container debug inspector (processes/fs/network/env/resources), layout presets, regex code search, deploy monitoring alerts, automated security patching, image vulnerability scanner, project embed widget configurator, smart terminal with autocomplete, project documentation wiki (versioned pages), platform status/incidents page, RSS changelog feeds, social sharing cards (OG meta), template versioning, auto-documentation from TypeScript types.
- **Platform Services (288+ services):** Real-time collaboration (Socket.IO + Yjs), container engine, GitHub integration, AI code features (complete/refactor/fix/explain/review/debug), deploy pipelines, notification system, explore/social, team management, billing/subscriptions, project analytics, access control, workspace settings, asset storage, project secrets, preview deployments, custom domains, activity feed, usage limits, webhooks, user onboarding, feature flags, support tickets, code review system, crash reports, cloud functions, scheduled tasks, edge config, database backups, log streaming, API keys, search index, email service, Stripe billing, SSO providers, IP filtering, session management, GDPR compliance, deployment strategies (blue-green/canary/rolling), platform metrics, GraphQL API, CLI tools, project archival, object storage, service mesh, learning paths, hackathons, workspace-sync, code-review-ai, container-snapshots, live-share, project-import, project-export, container-logs, user-preferences, build-cache, custom-runners, project-templates-store, debug-sessions, project-variables, resource-limits, project-badges, deploy-rollback, project-forks, code-formatting, project-milestones, user-activity-log.
- **Real-Time Collaboration:** Socket.IO server with auth, presence, cursor tracking, Yjs CRDT sync, terminal sharing, and follow mode. Frontend hooks: useSocketIO (connection mgmt), useYjsCollaboration (CRDT editing). PresenceBar component shows live collaborators in IDE header.
- **Issue Tracker:** Project-level issue tracking with status (open/in-progress/closed), labels (bug/feature/improvement), assignee from collaborators, code references (file+line), and threaded comments via extended comments table (issueId column). API at `/projects/:id/issues`. Frontend panel in IDE Tools menu.
- **Frontend Pages (42+):** Landing, dashboard, project IDE, explore, pricing, settings, admin, profile, billing, teams, domains, webhooks, onboarding, support, wiki, snippets, status, changelog, incidents, error dashboard, compliance, funnel dashboard, revenue analytics, image registry, code metrics, container health, admin revenue, live session, integrations, developer settings, org settings, transfer, import-project, live-share, template-store, error-tracking.
- **Automated Testing on Deploy:** Configurable per-project test command that runs before deployment. If tests fail, the deploy is blocked and marked as "failed" with test output visible in the deploy logs. UI for configuring test command in "Deploy Settings" panel. Deployment detail view shows test results (pass/fail status and output) above build logs.
- **DB Schemas Added:** db_sync_logs, todos, exec_history, wiki_pages, wiki_page_versions, coding_stats, coding_streaks, incidents, incident_updates, milestones, milestone_tasks, issues (with JSONB code references).
- **Tools Menu:** All new panels accessible via the "Tools" dropdown in the IDE toolbar.

## External Dependencies

- **Auth:** Clerk (@clerk/express, @clerk/react)
- **Database:** PostgreSQL (via Drizzle ORM)
- **Code Editor:** Monaco Editor (@monaco-editor/react)
- **Terminal:** xterm.js
- **Frontend Framework:** React 19
- **Build Tool:** Vite, esbuild
- **Styling:** Tailwind CSS v4
- **Routing:** wouter
- **State Management:** Zustand (for auth store)
- **API Client Generation:** Orval
- **Validation:** Zod, `drizzle-zod`
- **WebSockets:** `ws` library, Socket.IO (`socket.io` server, `socket.io-client` frontend)
- **Real-Time Collaboration:** Yjs CRDT (`yjs`, `y-monaco`)
- **Security:** `helmet`, `cors`, `express-rate-limit`
- **Encryption:** AES-256-GCM
- **Third-party Integrations (Catalog):** Slack, Discord, Jira, Linear, Notion, Figma (conceptual; actual integration depends on user configuration)

### Background Jobs
- `containerCleanup` — Stop idle containers (every 5min)
- `metricsCollection` — Collect system metrics (every 1min)
- `emailProcessing` — Process email queue (every 30s)
- `tokenCleanup` — Clean expired refresh tokens (every 1hr)
- `deploymentHealthCheck` — Check deployed apps (every 30s)
- `containerHealthCheck` — Monitor container resource usage, auto-restart unhealthy containers (every 60s)

### API Routes (mounted at /api)
- `GET /healthz` — Health check
- `POST /auth/register|login|refresh|logout|logout-all|change-password` — JWT auth
- `POST /auth/forgot-password` — Generates crypto reset token (1hr TTL), returns generic success message
- `POST /auth/reset-password` — Verifies token, updates password hash, revokes all sessions
- `GET /auth/google` + `POST /auth/google/callback` — Google OAuth
- `GET /auth/github` + `POST /auth/github/callback` — GitHub OAuth (repo scope)
- `GET/PATCH /profile` — User profile
- `GET/POST /projects` — List/create projects
- `GET/PATCH/DELETE /projects/:id` — Project CRUD
- `POST /projects/:id/fork` — Fork project
- `GET /projects/:id/export` — Export as ZIP
- `GET/POST /projects/:id/files` — File listing/creation
- `GET/PATCH/DELETE /projects/:projectId/files/:fileId` — File CRUD
- `PATCH /projects/:projectId/files/:fileId/move` — Move/rename file
- `GET/POST /projects/:id/collaborators` — Collaborator management
- `GET/POST /projects/:id/deployments` — Deployment management
- `GET /templates` — Starter templates (public)
- `GET /explore` — Browse public projects (public)
- `GET /dashboard/stats|recent-activity|language-breakdown` — Dashboard
- `POST/GET /stars` — Star/unstar projects
- `GET/PATCH /notifications` — Notifications
- `POST/GET /ai/conversations` — AI chat
- `POST /ai/conversations/:id/messages` — AI messages
- `POST/GET /comments` — Project comments
- `GET /containers/status` — Container health monitoring (admin only)
- `GET /admin/*` — Admin endpoints
- `GET/POST/DELETE /settings/api-keys` — API key management
- `POST/GET /feedback` — User feedback
- `POST /format` — Code formatting (Prettier)
- `GET /integrations/catalog` — Browse available integrations (public)
- `GET/POST/DELETE /projects/:id/integrations` — Install/uninstall project integrations
- `POST /projects/:id/integrations/:id/webhook` — Configure integration webhook
- `POST /projects/:id/gpu/enable` — Enable GPU for project (Pro plan required)
- `POST /projects/:id/gpu/disable` — Disable GPU for project
- `GET /projects/:id/gpu/status` — Get GPU allocation status
- `GET /projects/:id/gpu/metrics` — Get real-time GPU metrics (utilization, VRAM, temperature, power)
- `GET /migrations/hosts` — Available migration hosts
- `POST /projects/:id/migrations` — Start live container migration
- `GET /projects/:id/migrations` — List project migrations
- `GET/POST /migrations/:id` — Get migration status / cancel
- `GET /billing/pricing` — Plan definitions and metered pricing (public)
- `GET /billing/summary` — User billing summary with usage breakdown
- `POST /projects/:id/domains` — Add custom domain to project
- `GET /projects/:id/domains` — List project domains
- `POST /domains/:id/verify` — Verify domain DNS
- `DELETE /domains/:id` — Remove domain
- `GET /domains/my` — List user's domains
- `POST /domains/check` — Check domain availability
- `POST /domains/purchase` — Purchase a domain
- `GET /mobile/dashboard` — Mobile-optimized dashboard
- `GET /mobile/projects/:id` — Mobile project quick view
- `GET /mobile/projects/:projectId/files/:fileId` — Mobile file content
- `GET /mobile/projects/:id/sync` — Mobile file sync (delta)

### Validation Schemas (Zod)
All route bodies validated with Zod schemas in `src/validators/schemas.ts`:
Register, Login, CreateProject, CreateFile, UpdateFile, MoveFile, Deploy, AddSecret, InviteCollaborator, UpdateProject, Pagination, Search, FormatCode, ChangePassword, CreateApiKey, Feedback, Comment

### Frontend Pages
- `/` — Landing page (commercial: hero, social proof, features, pricing tiers, testimonials, full footer) → /dashboard redirect when signed in
- `/login` — Custom login page: email+password form, Google OAuth, GitHub OAuth, Zod validation, loading states, split-screen branded layout
- `/register` — Custom register page: username+email+password+confirm form, OAuth buttons, terms checkbox, password strength indicator, Zod validation
- `/forgot-password` — Forgot password page: email form, success confirmation with "check your email" state
- `/reset-password?token=xxx` — Reset password page: new password form with strength indicator, confirm password, handles missing/invalid token states
- `/sign-in`, `/sign-up` — Clerk authentication
- `/dashboard` — Project hub with stats, plan usage bar, quick-start cards, loading skeletons, upgrade prompts, notifications
- `/project/:id` — Full IDE: drag-and-drop file tree, Monaco editor with tabs, code folding, theme toggle (dark/light), debounced auto-save (2s), terminal UI, live preview, AI chat panel, resource monitor
- `/explore` — Public projects with search/filter/fork
- `/pricing` — Pricing page with Monthly/Annual toggle, 3 tiers (Free/Pro/Team), feature comparison, FAQ
- `/settings` — Tabbed: Profile, Billing & Plan (usage bars, billing history, payment method), API Keys, Appearance
- `/admin` — Admin panel: Overview, Users, Projects, Audit Log
- `/changelog` — Platform changelog with version history
- `/status` — System status page with health checks
- `/api-docs` — Interactive API documentation
- `/integrations` — Integration marketplace: browse/install Slack, Discord, Jira, Linear, Notion, Figma with webhook config
- `/billing` — Billing dashboard with plan details, usage meters, metered pricing, and plan management
- `/domains` — Custom domains management page with DNS verification, SSL status, and domain purchase
- `/security` — Security settings page with SSH key management, two-factor auth, and active sessions
- `/*` — Professional 404 page with branded header and navigation

### IDE Components
- `GlobalSearch` — Multi-file search & replace with regex, file filters
- `FeedbackModal` — Bug report / feature request modal
- `ShareEmbed` — Share links, embed code, social sharing
- `ResourceMonitor` — Live CPU/memory/GPU graphs with warning indicators, GPU utilization/VRAM/temperature display, and Pro plan upgrade prompt for free users
- `TerminalPanel` — xterm.js terminal with multi-tab support, tab-completion, command history, search, simulated shell (help, ls, cd, git, node, npm, etc.), run/stop integration
- `CollabCursors` — Color-coded collaborative cursors with fade-on-inactivity and click-to-follow
- `Breadcrumbs` — File path breadcrumb navigation above editor with dropdown file picker
- `StatusBar` — Bottom bar showing git branch, connection status, cursor position, language, encoding, indentation

### Email Service
Template-based HTML emails: welcome, password reset, email verification, collaboration invite, deployment notification, weekly digest

## Key Commands

- `cd lib/db && npx tsc --build` — Build DB package (required before API typecheck)
- `pnpm --filter @workspace/api-server run typecheck` — Typecheck API server
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — Push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server exec tsx src/seed.ts` — Seed template data

## Important Notes

- **DB build order**: Must run `cd lib/db && npx tsc --build` before API server typecheck due to composite project references
- **Codegen fix**: After running codegen, `lib/api-zod/src/index.ts` must only contain `export * from "./generated/api";` — codegen regenerates conflicting type barrels
- **Clerk auth**: Server uses `@clerk/express` middleware + custom `requireAuth` that auto-creates DB users from Clerk sessions
- **JWT auth**: Additive auth system for API clients — register/login/refresh/logout with brute-force lockout. Password reset via in-memory crypto tokens (1hr TTL).
- **Zustand auth store**: `src/stores/authStore.ts` — user, token, isAuthenticated, isLoading, error + login/register/logout/refreshAuth/loginWithGoogle/loginWithGithub/checkAuth actions
- **GitHub OAuth**: Scopes `read:user user:email`. Requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` env vars. State param mandatory, CSRF-protected with in-memory store + 10-min expiry. Only verified emails used for account linking.
- **Authorization**: `requireProjectAccess(role)` middleware checks owner/collaborator/public access with IDOR prevention
- **Encryption**: Project secrets use AES-256-GCM. SECRETS_ENCRYPTION_KEY env var required in production, falls back to dev key with warning.
- **Recursive operations**: Directory delete/move uses `like(path, \`${prefix}%\`)` pattern for recursive child matching
- **GPU support**: Pro plan users can enable GPU (NVIDIA Tesla T4) per project. GPU container service manages allocation/release with CUDA 12.x, NVIDIA runtime flags. GPU metrics are simulated for dev. Free-tier users see upgrade prompt.
- **No Docker**: Container execution is simulated (UI-only terminal + status indicators)
- **No Redis**: In-memory for caching/queues/rate-limiting
- **Dark theme**: Primary bg `hsl(222 47% 11%)`, accent blue `hsl(224 76% 48%)`, light theme toggle available in IDE
- **Express 5**: Wildcard routes need `/{*splat}` syntax; async handlers need `Promise<void>` annotation; params can be `string | string[]`
- **Tailwind v4**: No `@apply dark` — use `html { color-scheme: dark; }` with `@custom-variant dark (&:is(.dark *))`
- **AuthenticatedRequest**: Typed interface in `artifacts/api-server/src/types.ts`
- **Monaco editor**: Uses `editorRef` (useRef) for getValue, code folding with #region support, auto-save with 2s debounce
- **AI chat**: Sliding panel in IDE, integrates with `/api/ai/conversations` endpoints
- **Auto-save**: Debounced 2s auto-save on editor changes, manual Ctrl+S still available
- **Drag-and-drop**: File tree supports drag-and-drop to move files between folders
