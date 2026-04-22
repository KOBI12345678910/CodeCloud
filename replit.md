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
- **API Server:** An Express 5 REST API manages all backend operations (311+ route files).
- **Database:** PostgreSQL is used with Drizzle ORM.
- **Authentication:** Clerk handles user management, supplemented by JWT for API client authentication. OAuth integrations for Google and GitHub are supported. 2FA/TOTP with hashed backup codes.
- **Validation:** Zod is used for API request body validation.
- **WebSocket:** A dedicated WebSocket server supports real-time features using Socket.IO and Yjs CRDT.
- **Security:** 2FA/TOTP, active session tracking with device detection, login history, auto-audit middleware (body-less), plan-tiered rate limits (free/pro/team), Security Center UI at /security with 4 tabs.
- **AI Gateway:** 38 AI models from 25 providers (OpenAI, Anthropic, Google, xAI, DeepSeek, Meta, Mistral, Qwen, Cohere, Ollama, Perplexity, AI21, Together, Fireworks, Cerebras, Inflection, Zhipu, MiniMax, Moonshot, Yi, SambaNova, NVIDIA, Amazon, Azure, Baichuan). Smart AI Router auto-selects optimal model by task/cost/speed. AI Benchmark system. BYOK support.
- **Credits & Billing:** Stripe integration, credit rollover (pro: 100, team: 300), on-demand top-ups, metered billing, usage tracking.
- **SCIM v2:** Enterprise SSO user provisioning (Users CRUD, ServiceProviderConfig, ResourceTypes, Schemas).
- **Design Templates:** 18 ready-to-deploy templates across 12 categories (SaaS, e-commerce, AI, mobile, etc.)
- **Real-Time Collaboration:** Socket.IO and Yjs CRDT for multiplayer editing.
- **Container/Deployment:** Container engine, GPU support, blue-green deployments, canary analysis, geo-routing, CDN cache, multi-region, edge deploy, warm pools.
- **DevOps:** CI/CD pipeline, build cache, coverage, linting, vulnerability scanning, auto-rollback.
- **i18n:** 134+ language support with RTL.

## Key Routes Added (Recent)
- `/api/ai/models` — List all 38 AI models with metadata
- `/api/ai/smart-route` — Smart AI routing based on task/budget/quality
- `/api/ai/recommend/:strategy/:task` — Get model recommendation (cheapest/fastest/best)
- `/api/ai/benchmark` — Full AI model benchmark with leaderboard
- `/api/ai/compare` — Side-by-side model comparison
- `/api/ai/estimate-cost` — Cost estimation for token usage
- `/api/credits/balance` — Credit balance with rollover info
- `/api/credits/topup` — On-demand credit purchase
- `/api/credits/rollover` — Monthly rollover processing
- `/api/credits/history` — Credit transaction history
- `/api/scim/v2/*` — SCIM v2 user provisioning (enterprise SSO)
- `/api/design-templates` — Template marketplace (18 templates, 12 categories)
- `/api/security/*` — 2FA, sessions, login history

## Frontend Pages (Recent)
- `/ai-models` — AI Model Marketplace with search, filter, compare, smart recommend
- `/security` — Security Center (2FA, sessions, login history)
- `/pricing` — 4-tier pricing page
- `/billing` — Billing dashboard

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
