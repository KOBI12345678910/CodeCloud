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
- **Authentication:** Clerk handles user management, supplemented by JWT for API client authentication. OAuth integrations for Google and GitHub are supported. 2FA/TOTP with hashed backup codes.
- **Validation:** Zod is used for API request body validation.
- **WebSocket:** A dedicated WebSocket server supports real-time features using Socket.IO and Yjs CRDT.
- **Security:** 2FA/TOTP, active session tracking with device detection, login history, auto-audit middleware (body-less), plan-tiered rate limits (free/pro/team), Security Center UI at /security with 4 tabs.
- **AI Gateway:** 38 AI models from 23 providers (OpenAI, Anthropic, Google, xAI, DeepSeek, Meta, Mistral, Qwen, Cohere, Ollama, Perplexity, AI21, Together, Fireworks, Cerebras, Inflection, Zhipu, MiniMax, Moonshot, Yi, SambaNova, NVIDIA, Amazon). Smart AI Router auto-selects optimal model by task/cost/speed. AI Benchmark system. BYOK support.
- **Credits & Billing:** Stripe integration, credit rollover (pro: 100, team: 300), on-demand top-ups, metered billing, usage tracking.
- **SCIM v2:** Enterprise SSO user provisioning (Users CRUD, ServiceProviderConfig, ResourceTypes, Schemas).
- **Design Templates:** 18 ready-to-deploy templates across 12 categories (SaaS, e-commerce, AI, mobile, etc.)
- **Design System:** Full design tokens (colors, typography, spacing, radii, shadows, animations), export to CSS/Tailwind/SCSS/Figma.
- **Real-Time Collaboration:** Socket.IO and Yjs CRDT for multiplayer editing.
- **Container/Deployment:** Container engine, GPU support, blue-green deployments, canary analysis, geo-routing, CDN cache, multi-region, edge deploy, warm pools, autoscale (CPU/Memory/RPS), static site deployments.
- **BaaS:** Backend-as-a-Service with database, auth, storage, edge functions, realtime, webhooks.
- **MCP Integration:** 5 built-in MCP servers (Filesystem, Database, Git, Browser, Terminal) + custom server support.
- **White-Label:** Enterprise custom branding (logo, colors, domain, emails, SEO).
- **Publishing Controls:** Approval workflows, environments (production/staging/preview), rollback, pre-publish checks.
- **Sharing Controls:** Public/private/internal/unlisted visibility, share links, embed codes.
- **Knowledge Base:** Custom AI context documents, URL import, token-tracked (100K limit).
- **RBAC:** 5 system roles + custom role creation with granular permission matrix.
- **Internal Publish:** Private deployments for team/org only with IP restrictions and password protection.
- **DevOps:** CI/CD pipeline, build cache, coverage, linting, vulnerability scanning, auto-rollback.
- **i18n:** 134+ language support with RTL.

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
- `/ai-models` — AI Model Marketplace
- `/differentiators` — 20 differentiator features
