# CodeCloud — Cloud IDE Platform

## Overview

CodeCloud is a browser-based cloud IDE platform designed to provide a comprehensive development environment. It enables users to create, edit, run, and deploy code directly from their web browser, supporting multiple programming languages and frameworks through a template-driven project creation system. The platform aims to offer a seamless, collaborative, and efficient cloud-native development experience, featuring a robust code editor, file management, an integrated terminal, live previews, and one-click deployment.

## User Preferences

I prefer concise and direct communication. When making changes, prioritize functional correctness and performance. For architectural decisions, provide a brief justification for the chosen approach. I expect iterative development with clear steps. Please ask for confirmation before implementing significant changes or refactoring large portions of the codebase. Do not make changes to the `artifacts/mockup-sandbox` folder.

## System Architecture

The project is structured as a pnpm monorepo using TypeScript, with distinct artifacts for the API server, client-side IDE, and shared libraries.

**UI/UX Decisions:**
The frontend uses React 19, Vite, and Tailwind CSS v4, providing a responsive and modern interface. The IDE includes a Monaco editor, resizable panels, a customizable dark theme, multi-file search, resource monitoring, a fully-featured terminal (xterm.js), collaborative cursors, file breadcrumbs, split-editor view, image and Markdown previews, and integrated Git and environment variable editors. Layout persistence is managed per project using local storage.

**Technical Implementations:**
- **API Server:** An Express 5 REST API manages all backend operations.
- **Database:** PostgreSQL is used with Drizzle ORM.
- **Authentication:** Clerk handles user management, supplemented by JWT for API client authentication. OAuth integrations for Google and GitHub are supported.
- **Validation:** Zod is used for API request body validation.
- **API Codegen:** Orval generates React Query hooks and Zod schemas from an OpenAPI specification for type safety.
- **WebSocket:** A dedicated WebSocket server (`/ws`) supports real-time features like terminal interaction, collaboration, notifications, and deployment logs using connection pooling and pub/sub.
- **Security:** Helmet, CORS, and `express-rate-limit` middlewares are implemented. AES-256-GCM encrypts project secrets.
- **Middleware Stack:** Includes `requestId`, `requestLogger`, `responseTime`, `noSniff`, and `auditMiddleware`.
- **Background Jobs:** Asynchronous tasks like container cleanup, metrics collection, and email processing are managed.
- **Authorization:** `requireProjectAccess(role)` middleware enforces access control based on user roles and project ownership.
- **Container Simulation:** The platform currently simulates container execution.
- **Email Service:** Template-based HTML emails are used for notifications.
- **Real-Time Collaboration:** Socket.IO and Yjs CRDT enable real-time collaboration with presence tracking and terminal sharing.
- **Issue Tracker:** A project-level issue tracking system is integrated.
- **Automated Testing:** Configurable per-project test commands run before deployment, blocking deployment if tests fail.

## External Dependencies

- **Auth:** Clerk (`@clerk/express`, `@clerk/react`)
- **Database:** PostgreSQL (via Drizzle ORM)
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Terminal:** xterm.js
- **Frontend Framework:** React 19
- **Build Tool:** Vite, esbuild
- **Styling:** Tailwind CSS v4
- **Routing:** wouter
- **State Management:** Zustand
- **API Client Generation:** Orval
- **Validation:** Zod, `drizzle-zod`
- **WebSockets:** `ws` library, Socket.IO (`socket.io`, `socket.io-client`)
- **Real-Time Collaboration:** Yjs CRDT (`yjs`, `y-monaco`)
- **Security:** `helmet`, `cors`, `express-rate-limit`
- **Encryption:** AES-256-GCM
- **Third-party Integrations (Catalog):** Slack, Discord, Jira, Linear, Notion, Figma (conceptual)