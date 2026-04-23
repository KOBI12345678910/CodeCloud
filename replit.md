# CodeCloud — Cloud IDE Platform

## Overview

CodeCloud is a browser-based cloud IDE platform providing a comprehensive development environment for creating, editing, running, and deploying code directly from the web. It supports multiple programming languages and frameworks through template-driven project creation, aiming for a seamless, collaborative, and efficient cloud-native development experience. Key capabilities include a robust code editor, file management, integrated terminal, live previews, and one-click deployment. The platform targets market potential by offering a unified development experience comparable to leading IDEs, with ambitions for extensive AI integration, enterprise-grade security, and a flexible billing ecosystem.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and performance. For architectural decisions, provide a brief justification for the chosen approach. I expect iterative development with clear steps. Please ask for confirmation before implementing significant changes or refactoring large portions of the codebase. Do not make changes to the `artifacts/mockup-sandbox` folder. User speaks Hebrew primarily.

## System Architecture

The project is a pnpm monorepo using TypeScript, structured with distinct artifacts for the API server, client-side IDE, and shared libraries.

**UI/UX Decisions:**
The frontend utilizes React 19, Vite, and Tailwind CSS v4 for a responsive and modern interface. Design principles are inspired by Replit/Lovable (2026), featuring a prompt-first landing page, categorized project creation, example prompts, and animated statistics. The platform includes a 4-tier pricing model with monthly/yearly toggles. The IDE incorporates a Monaco editor, resizable panels, a customizable dark theme, multi-file search, resource monitoring, a fully-featured xterm.js terminal, collaborative cursors, split-editor view, image and Markdown previews, and integrated Git and environment variable editors. Layout persistence is managed per project.

**Technical Implementations:**
- **API Server:** An Express 5 REST API handles all backend operations.
- **Database:** PostgreSQL with Drizzle ORM.
- **Authentication:** Clerk for user management, JWT for API client authentication, supporting Google and GitHub OAuth. Features 2FA/TOTP and SAML/SSO.
- **Validation:** Zod is used for API request body validation.
- **API Codegen:** Orval generates React Query hooks and Zod schemas from an OpenAPI specification.
- **WebSocket:** A dedicated WebSocket server (`/ws`) using Socket.IO and Yjs CRDT supports real-time features like terminal interaction, collaboration, and notifications.
- **Security:** Implemented with Helmet, CORS, `express-rate-limit`, plan-tiered rate limits, AES-256-GCM encryption for secrets, active session tracking, brute-force lockout, API key scoping, IP allowlisting, and org-level RBAC policies. A dedicated Security Center UI is provided.
- **Compliance & Privacy:** Supports GDPR DSAR, granular cookie consent, data residency (US/EU/APAC), data retention policies, and DPA generation.
- **AI Gateway:** Connects to 38 AI models from 25 providers with a Smart AI Router for optimal model selection, AI Benchmarking, BYOK support, and in-project AI chat.
- **Credits & Billing:** Stripe integration for billing, credit management, on-demand top-ups, and metered billing. An Admin Pricing Engine allows full control over service prices and margins, complemented by a Service Marketplace for granular billing. Supports 11 payment methods.
- **Universal AI Model Connector:** Allows integration of any AI model from 25+ providers, with admin controls for pricing, rate limits, and health monitoring.
- **Super Admin Control Center:** A unified dashboard providing access to 12 admin control panels.
- **Staff Portal (`/staff`):** A separate employee-only management portal with sidebar navigation (RTL Hebrew), 7 modules: Dashboard (real-time KPIs from DB via `/api/admin/stats` + `/api/health`), Customer Management (live data from `/api/admin/users` with plan normalization), Billing & Pricing (plans, services, coupons, invoices), Support & Tickets (DB-backed via `/api/admin/tickets` from issues table), Platform Management (servers, DB, CDN, AI, security), Content & Templates, System Settings (toggles for maintenance mode, registration, SSL, 2FA, backups). All mock data replaced with real DB queries. Protected by `AdminRoute` (admin/owner role required). Full RTL support (text-right headers, right-aligned search icons).
- **Staff Login (`/staff-login`):** Dedicated employee login page with red/dark theme, separate from customer login. Accessible via subtle footer link.
- **SCIM v2:** Supports enterprise SSO user provisioning.
- **Design Templates:** 18 ready-to-deploy templates across various categories.
- **Design System:** Comprehensive design tokens exportable to various formats.
- **Real-Time Collaboration:** Socket.IO and Yjs CRDT enable multiplayer editing, terminal sharing, and presence tracking.
- **Container/Deployment:** Features a simulated container engine UI, GPU support, blue-green/canary deployments, geo-routing, CDN, multi-region, autoscale, and static site deployments.
- **BaaS:** Offers Backend-as-a-Service with database, auth, storage, edge functions, and real-time capabilities.
- **MCP Integration:** Integrates with 5 built-in MCP servers (Filesystem, Database, Git, Browser, Terminal) and supports custom servers.
- **White-Label:** Provides enterprise custom branding options.
- **Publishing Controls:** Includes approval workflows, environment management (production/staging/preview), and rollback capabilities.
- **Sharing Controls:** Manages public/private/internal/unlisted visibility and shareable links.
- **Knowledge Base:** Custom AI context documents with URL import.
- **RBAC:** Supports 5 system roles and custom role creation with a granular permission matrix.
- **Internal Publish:** Enables private deployments with IP restrictions and password protection.
- **DevOps:** CI/CD pipeline, build cache, coverage, linting, vulnerability scanning, and automated testing before deployment.
- **i18n:** Supports 134+ languages, including RTL.
- **Middleware Stack:** Includes `requestId`, `requestLogger`, `responseTime`, `noSniff`, and `auditMiddleware`.
- **Infrastructure Services:** Redis cache simulation, database backup management (PITR, snapshots), CDN configuration, observability dashboard, BullMQ-like queue persistence, graceful shutdown, and enhanced health monitoring.
- **Background Jobs:** Asynchronous tasks for maintenance and processing.
- **Authorization:** `requireProjectAccess` middleware enforces access control based on user roles and project context, including IDOR prevention.
- **Issue Tracker:** Project-level issue tracking with status, labels, assignees, code references, and threaded comments.
- **GitHub Sync:** Two-way GitHub synchronization with push/pull/history tracking (backend: `/api/github-sync/*`).
- **Extensions Marketplace:** 12 curated extensions across categories with install/uninstall (backend: `/api/extensions-marketplace/*`).
- **Version History:** Checkpoint system with auto/manual/deploy/ai_agent types (backend: `/api/version-history/*`).
- **Community Hub:** Public page showcasing creators, projects, forks, and trending content.
- **Debugger:** Interactive debugging with breakpoints, call stack, variables, watch expressions, and console.
- **Package Manager:** Visual dependency management with search, install, update, and vulnerability scanning.
- **Themes:** 10 editor themes with live preview and customization.
- **Component Library:** Reusable UI component collection with live previews and code snippets.
- **Figma Import:** Convert Figma designs to React/Tailwind components.
- **AI Code Review:** Automated code analysis with security, performance, and style checks plus auto-fix suggestions.
- **Project & Organization Management:** Functionality for creating, listing, forking, exporting, and managing projects, files, collaborators, and deployments. Also supports organization, member, and shared secret management.
- **IDE Tools:** Comprehensive suite of IDE tools including Docker image builder, rate limit dashboard, performance auditing, dependency license checker, collaborative TODO list, traffic analytics, coding time tracking, environment comparison, container networking, cost optimizer, container debug inspector, regex code search, deploy monitoring alerts, automated security patching, image vulnerability scanner, project embed widget configurator, smart terminal, project documentation wiki, and auto-documentation from TypeScript types.
- **Platform Services:** Includes a wide array of services like container engine, GitHub integration, notification system, team management, activity feed, usage limits, webhooks, user onboarding, feature flags, support tickets, cloud functions, scheduled tasks, edge config, database backups, log streaming, API keys, search index, email service, SSO providers, IP filtering, session management, deployment strategies, platform metrics, GraphQL API, CLI tools, and project archival.

## External Dependencies

- **Auth:** Clerk (`@clerk/express`, `@clerk/react`), TOTP (`otpauth`, `qrcode`)
- **Database:** PostgreSQL (via Drizzle ORM)
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Terminal:** xterm.js
- **Frontend Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4
- **Routing:** wouter
- **State Management:** Zustand
- **Validation:** Zod, `drizzle-zod`
- **WebSockets:** Socket.IO (`socket.io`, `socket.io-client`)
- **Real-Time Collaboration:** Yjs CRDT (`yjs`, `y-monaco`)
- **Security:** `helmet`, `cors`, `express-rate-limit`
- **Payments:** Stripe (`stripe`)