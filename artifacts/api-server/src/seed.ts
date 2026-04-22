import { db, templatesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const templates = [
  {
    name: "Vanilla JavaScript",
    slug: "vanilla-js",
    description: "A simple JavaScript starter with HTML and CSS",
    language: "javascript",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    runCommand: "npx serve .",
    entryFile: "index.html",
    dockerImage: "node:20-alpine",
    sortOrder: 1,
    filesSnapshot: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>Hello World</h1>
      <p class="subtitle">Welcome to your JavaScript project</p>
    </header>
    <main>
      <div id="output"></div>
    </main>
  </div>
  <script src="src/app.js" type="module"></script>
</body>
</html>`,
      "style.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  background: #1a1a2e;
  color: #e0e0e0;
}

#app {
  text-align: center;
  padding: 2rem;
}

.subtitle {
  color: #888;
  margin-top: 0.5rem;
}

main {
  margin-top: 2rem;
}`,
      "src/app.js": `import { greet } from './utils.js';

const output = document.getElementById('output');
output.textContent = greet('CodeCloud');
console.log("App initialized");`,
      "src/utils.js": `export function greet(name) {
  return \`Hello from \${name}!\`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}`,
    },
  },
  {
    name: "Node.js",
    slug: "nodejs",
    description: "A Node.js starter with HTTP server",
    language: "javascript",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
    runCommand: "node index.js",
    entryFile: "index.js",
    dockerImage: "node:20-alpine",
    sortOrder: 2,
    filesSnapshot: {
      "index.js": `const http = require("http");
const { router } = require("./src/router");

const server = http.createServer((req, res) => {
  router(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      "src/router.js": `const { handleHome } = require("./handlers/home");
const { handleHealth } = require("./handlers/health");

function router(req, res) {
  if (req.url === "/" && req.method === "GET") {
    handleHome(req, res);
  } else if (req.url === "/health" && req.method === "GET") {
    handleHealth(req, res);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
}

module.exports = { router };`,
      "src/handlers/home.js": `function handleHome(req, res) {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h1>Hello from CodeCloud!</h1>");
}

module.exports = { handleHome };`,
      "src/handlers/health.js": `function handleHealth(req, res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
}

module.exports = { handleHealth };`,
      "package.json": `{
  "name": "node-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}`,
      ".gitignore": `node_modules/
.env`,
    },
  },
  {
    name: "Express",
    slug: "express",
    description: "An Express.js API server with routing and middleware",
    language: "javascript",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg",
    runCommand: "node index.js",
    entryFile: "index.js",
    dockerImage: "node:20-alpine",
    sortOrder: 3,
    filesSnapshot: {
      "index.js": `const express = require("express");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/logger");
const apiRoutes = require("./routes/api");
const healthRoutes = require("./routes/health");

const app = express();

app.use(express.json());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({ message: "Hello from CodeCloud!" });
});

app.use("/api", apiRoutes);
app.use("/health", healthRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Express server running on port \${PORT}\`);
});`,
      "routes/api.js": `const { Router } = require("express");
const router = Router();

const items = [];

router.get("/items", (req, res) => {
  res.json({ data: items });
});

router.post("/items", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  const item = { id: Date.now().toString(), name, createdAt: new Date() };
  items.push(item);
  res.status(201).json({ data: item });
});

router.delete("/items/:id", (req, res) => {
  const index = items.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Item not found" });
  }
  items.splice(index, 1);
  res.status(204).end();
});

module.exports = router;`,
      "routes/health.js": `const { Router } = require("express");
const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

module.exports = router;`,
      "middleware/errorHandler.js": `function notFound(req, res, next) {
  res.status(404).json({ error: \`Route \${req.originalUrl} not found\` });
}

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
}

module.exports = { notFound, errorHandler };`,
      "middleware/logger.js": `function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(\`\${req.method} \${req.originalUrl} \${res.statusCode} \${duration}ms\`);
  });
  next();
}

module.exports = { requestLogger };`,
      "package.json": `{
  "name": "express-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  }
}`,
      ".gitignore": `node_modules/
.env`,
    },
  },
  {
    name: "Python",
    slug: "python",
    description: "A Python starter project with modules",
    language: "python",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    runCommand: "python main.py",
    entryFile: "main.py",
    dockerImage: "python:3.12-slim",
    sortOrder: 4,
    filesSnapshot: {
      "main.py": `from src.greeter import greet
from src.utils import format_list

def main():
    print(greet("CodeCloud"))
    items = ["Python", "is", "awesome"]
    print(format_list(items))

if __name__ == "__main__":
    main()`,
      "src/__init__.py": ``,
      "src/greeter.py": `def greet(name: str) -> str:
    return f"Hello from {name}!"

def farewell(name: str) -> str:
    return f"Goodbye, {name}!"`,
      "src/utils.py": `from typing import List

def format_list(items: List[str], separator: str = ", ") -> str:
    return separator.join(items)

def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(value, max_val))`,
      "requirements.txt": "",
      ".gitignore": `__pycache__/
*.pyc
.env
venv/`,
    },
  },
  {
    name: "Flask",
    slug: "flask",
    description: "A Flask web application with blueprints and templates",
    language: "python",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg",
    runCommand: "python app.py",
    entryFile: "app.py",
    dockerImage: "python:3.12-slim",
    sortOrder: 5,
    filesSnapshot: {
      "app.py": `from flask import Flask
from routes.main import main_bp
from routes.api import api_bp

app = Flask(__name__)

app.register_blueprint(main_bp)
app.register_blueprint(api_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)`,
      "routes/__init__.py": ``,
      "routes/main.py": `from flask import Blueprint, render_template_string

main_bp = Blueprint("main", __name__)

LAYOUT = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ title }}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; }
    header { background: #161b22; padding: 1rem 2rem; }
    main { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <header><h1>{{ title }}</h1></header>
  <main>{{ content | safe }}</main>
</body>
</html>"""

@main_bp.route("/")
def home():
    return render_template_string(LAYOUT, title="My Flask App", content="<p>Edit routes/main.py to get started.</p>")

@main_bp.route("/about")
def about():
    return render_template_string(LAYOUT, title="About", content="<p>Built on CodeCloud.</p>")`,
      "routes/api.py": `from flask import Blueprint, jsonify, request

api_bp = Blueprint("api", __name__)

@api_bp.route("/health")
def health():
    return jsonify({"status": "ok"})

@api_bp.route("/echo", methods=["POST"])
def echo():
    data = request.get_json(silent=True) or {}
    return jsonify({"echo": data})`,
      "requirements.txt": `flask>=3.0.0`,
      ".gitignore": `__pycache__/
*.pyc
.env
venv/`,
    },
  },
  {
    name: "Django",
    slug: "django",
    description: "A Django web application with views and routing",
    language: "python",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg",
    runCommand: "python manage.py runserver 0.0.0.0:3000",
    entryFile: "manage.py",
    dockerImage: "python:3.12-slim",
    sortOrder: 6,
    filesSnapshot: {
      "manage.py": `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()`,
      "myproject/__init__.py": ``,
      "myproject/settings.py": `import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me-in-production")
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "pages",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "myproject.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
    },
]

WSGI_APPLICATION = "myproject.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"`,
      "myproject/urls.py": `from django.urls import path, include

urlpatterns = [
    path("", include("pages.urls")),
]`,
      "myproject/wsgi.py": `import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
application = get_wsgi_application()`,
      "pages/__init__.py": ``,
      "pages/models.py": `from django.db import models`,
      "pages/urls.py": `from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("api/health/", views.health, name="health"),
]`,
      "pages/views.py": `from django.http import HttpResponse, JsonResponse

def home(request):
    return HttpResponse("<h1>Hello from CodeCloud!</h1><p>Edit pages/views.py to get started.</p>")

def health(request):
    return JsonResponse({"status": "ok"})`,
      "requirements.txt": `django>=5.0`,
      ".gitignore": `__pycache__/
*.pyc
db.sqlite3
.env
venv/`,
    },
  },
  {
    name: "TypeScript",
    slug: "typescript",
    description: "A TypeScript project with Node.js and modules",
    language: "typescript",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
    runCommand: "npx tsx index.ts",
    entryFile: "index.ts",
    dockerImage: "node:20-alpine",
    sortOrder: 7,
    filesSnapshot: {
      "index.ts": `import { greet } from "./src/greeter";
import { User } from "./src/types";

const user: User = {
  name: "Developer",
  email: "dev@codecloud.io",
};

console.log(greet(user.name));`,
      "src/greeter.ts": `export function greet(name: string): string {
  return \`Hello from CodeCloud, \${name}!\`;
}

export function farewell(name: string): string {
  return \`Goodbye, \${name}!\`;
}`,
      "src/types.ts": `export interface User {
  name: string;
  email: string;
}

export interface AppConfig {
  port: number;
  debug: boolean;
}`,
      "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "skipLibCheck": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}`,
      "package.json": `{
  "name": "typescript-app",
  "version": "1.0.0",
  "scripts": {
    "start": "npx tsx index.ts",
    "build": "tsc"
  }
}`,
      ".gitignore": `node_modules/
dist/
.env`,
    },
  },
  {
    name: "React",
    slug: "react",
    description: "A React app with Vite, TypeScript, and components",
    language: "typescript",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
    runCommand: "npm run dev",
    entryFile: "src/App.tsx",
    dockerImage: "node:20-alpine",
    sortOrder: 8,
    filesSnapshot: {
      "src/App.tsx": `import { Header } from "./components/Header";
import { Counter } from "./components/Counter";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <Header title="React + Vite" subtitle="Edit src/App.tsx to get started." />
      <main className="main">
        <Counter />
      </main>
    </div>
  );
}`,
      "src/components/Header.tsx": `interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="header">
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}`,
      "src/components/Counter.tsx": `import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <div className="counter-buttons">
        <button onClick={() => setCount((c) => c - 1)}>-</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount((c) => c + 1)}>+</button>
      </div>
    </div>
  );
}`,
      "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
      "src/App.css": `.app {
  text-align: center;
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.subtitle {
  color: #888;
}

.main {
  max-width: 600px;
  margin: 0 auto;
}

.counter {
  padding: 2rem;
  border: 1px solid #333;
  border-radius: 8px;
  display: inline-block;
}

.counter-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.counter-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #555;
  border-radius: 4px;
  background: #1a1a2e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 1rem;
}

.counter-buttons button:hover {
  background: #2a2a4e;
}`,
      "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  min-height: 100vh;
}`,
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
      "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
  },
});`,
      "package.json": `{
  "name": "react-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^6"
  }
}`,
      "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}`,
      ".gitignore": `node_modules/
dist/
.env`,
    },
  },
  {
    name: "Next.js",
    slug: "nextjs",
    description: "A Next.js app with App Router, layouts, and API routes",
    language: "typescript",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg",
    runCommand: "npm run dev",
    entryFile: "app/page.tsx",
    dockerImage: "node:20-alpine",
    sortOrder: 9,
    filesSnapshot: {
      "app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My App",
  description: "Built on CodeCloud",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
      "app/page.tsx": `import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1>Hello from CodeCloud!</h1>
      <p>Edit app/page.tsx to get started.</p>
      <nav>
        <Link href="/about">About</Link>
      </nav>
    </main>
  );
}`,
      "app/about/page.tsx": `import Link from "next/link";

export default function About() {
  return (
    <main className="container">
      <h1>About</h1>
      <p>This project was created on CodeCloud.</p>
      <Link href="/">Back to Home</Link>
    </main>
  );
}`,
      "app/api/health/route.ts": `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}`,
      "app/globals.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.container h1 {
  margin-bottom: 1rem;
}

.container p {
  margin-bottom: 1rem;
  color: #8b949e;
}

a {
  color: #58a6ff;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}`,
      "package.json": `{
  "name": "nextjs-app",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5"
  }
}`,
      "next.config.js": `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;`,
      "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,
      "next-env.d.ts": `/// <reference types="next" />
/// <reference types="next/image-types/global" />`,
      ".gitignore": `node_modules/
.next/
.env`,
    },
  },
  {
    name: "HTML/CSS",
    slug: "html-css",
    description: "A multi-page HTML/CSS website starter",
    language: "html",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
    runCommand: "npx serve .",
    entryFile: "index.html",
    dockerImage: "node:20-alpine",
    sortOrder: 10,
    filesSnapshot: {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <nav>
      <a href="index.html" class="active">Home</a>
      <a href="about.html">About</a>
    </nav>
    <h1>Welcome</h1>
    <p>Start building your website!</p>
  </header>
  <main>
    <section class="hero">
      <h2>Hello from CodeCloud</h2>
      <p>Edit index.html to get started.</p>
    </section>
  </main>
  <footer>
    <p>Built on CodeCloud</p>
  </footer>
</body>
</html>`,
      "about.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About - My Website</title>
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <nav>
      <a href="index.html">Home</a>
      <a href="about.html" class="active">About</a>
    </nav>
    <h1>About</h1>
  </header>
  <main>
    <section class="hero">
      <h2>About This Project</h2>
      <p>This website was created on CodeCloud.</p>
    </section>
  </main>
  <footer>
    <p>Built on CodeCloud</p>
  </footer>
</body>
</html>`,
      "css/reset.css": `*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}`,
      "css/style.css": `body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
}

header {
  padding: 2rem;
  text-align: center;
  background: #161b22;
}

nav {
  margin-bottom: 1rem;
}

nav a {
  color: #58a6ff;
  text-decoration: none;
  margin: 0 0.5rem;
  padding: 0.25rem 0.5rem;
}

nav a.active {
  border-bottom: 2px solid #58a6ff;
}

nav a:hover {
  text-decoration: underline;
}

main {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 3rem 0;
}

.hero h2 {
  margin-bottom: 1rem;
}

footer {
  text-align: center;
  padding: 1rem;
  background: #161b22;
  color: #8b949e;
}`,
    },
  },
  {
    name: "Go",
    slug: "go",
    description: "A Go project with HTTP server and packages",
    language: "go",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
    runCommand: "go run .",
    entryFile: "main.go",
    dockerImage: "golang:1.22-alpine",
    sortOrder: 11,
    filesSnapshot: {
      "main.go": `package main

import (
\t"fmt"
\t"log"
\t"net/http"
\t"os"

\t"myproject/handlers"
)

func main() {
\tmux := http.NewServeMux()
\tmux.HandleFunc("/", handlers.Home)
\tmux.HandleFunc("/health", handlers.Health)

\tport := os.Getenv("PORT")
\tif port == "" {
\t\tport = "3000"
\t}

\tfmt.Printf("Server running on port %s\\n", port)
\tlog.Fatal(http.ListenAndServe(":"+port, mux))
}`,
      "handlers/home.go": `package handlers

import (
\t"fmt"
\t"net/http"
)

func Home(w http.ResponseWriter, r *http.Request) {
\tw.Header().Set("Content-Type", "text/html")
\tfmt.Fprint(w, "<h1>Hello from CodeCloud!</h1>")
}`,
      "handlers/health.go": `package handlers

import (
\t"encoding/json"
\t"net/http"
\t"time"
)

var startTime = time.Now()

func Health(w http.ResponseWriter, r *http.Request) {
\tw.Header().Set("Content-Type", "application/json")
\tjson.NewEncoder(w).Encode(map[string]interface{}{
\t\t"status": "ok",
\t\t"uptime": time.Since(startTime).String(),
\t})
}`,
      "go.mod": `module myproject

go 1.22`,
      ".gitignore": `bin/
*.exe`,
    },
  },
  {
    name: "Rust",
    slug: "rust",
    description: "A Rust project with modules and Cargo",
    language: "rust",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg",
    runCommand: "cargo run",
    entryFile: "src/main.rs",
    dockerImage: "rust:1.77-slim",
    sortOrder: 12,
    filesSnapshot: {
      "src/main.rs": `mod greeter;
mod utils;

fn main() {
    let name = "CodeCloud";
    println!("{}", greeter::greet(name));

    let numbers = vec![1, 2, 3, 4, 5];
    println!("Sum: {}", utils::sum(&numbers));
    println!("Average: {:.2}", utils::average(&numbers));
}`,
      "src/greeter.rs": `pub fn greet(name: &str) -> String {
    format!("Hello from {}!", name)
}

pub fn farewell(name: &str) -> String {
    format!("Goodbye, {}!", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet() {
        assert_eq!(greet("World"), "Hello from World!");
    }

    #[test]
    fn test_farewell() {
        assert_eq!(farewell("World"), "Goodbye, World!");
    }
}`,
      "src/utils.rs": `pub fn sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}

pub fn average(numbers: &[i32]) -> f64 {
    if numbers.is_empty() {
        return 0.0;
    }
    sum(numbers) as f64 / numbers.len() as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sum() {
        assert_eq!(sum(&[1, 2, 3]), 6);
    }

    #[test]
    fn test_average() {
        assert_eq!(average(&[2, 4, 6]), 4.0);
    }

    #[test]
    fn test_average_empty() {
        assert_eq!(average(&[]), 0.0);
    }
}`,
      "Cargo.toml": `[package]
name = "myproject"
version = "0.1.0"
edition = "2021"

[dependencies]`,
      ".gitignore": `target/
Cargo.lock`,
    },
  },
  {
    name: "TensorFlow (GPU)",
    slug: "tensorflow-gpu",
    description: "A TensorFlow project with GPU support, CUDA toolkit, and sample training notebook",
    language: "python",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg",
    runCommand: "python train.py",
    entryFile: "train.py",
    dockerImage: "tensorflow/tensorflow:2.16.1-gpu",
    gpuSupported: true,
    cudaVersion: "12.2",
    sortOrder: 11,
    filesSnapshot: {
      "train.py": `import tensorflow as tf\nimport numpy as np\n\nprint("TensorFlow version:", tf.__version__)\nprint("GPU Available:", tf.config.list_physical_devices('GPU'))\n\nif tf.config.list_physical_devices('GPU'):\n    print("Running on GPU")\nelse:\n    print("Running on CPU")\n\n# Simple MNIST training example\nmnist = tf.keras.datasets.mnist\n(x_train, y_train), (x_test, y_test) = mnist.load_data()\nx_train, x_test = x_train / 255.0, x_test / 255.0\n\nmodel = tf.keras.models.Sequential([\n    tf.keras.layers.Flatten(input_shape=(28, 28)),\n    tf.keras.layers.Dense(128, activation='relu'),\n    tf.keras.layers.Dropout(0.2),\n    tf.keras.layers.Dense(10)\n])\n\nloss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)\nmodel.compile(optimizer='adam', loss=loss_fn, metrics=['accuracy'])\n\nprint("\\nTraining model...")\nmodel.fit(x_train, y_train, epochs=5, batch_size=64, validation_split=0.1)\n\nprint("\\nEvaluating...")\nmodel.evaluate(x_test, y_test, verbose=2)`,
      "requirements.txt": `tensorflow>=2.16.0\nnumpy>=1.26.0\nmatplotlib>=3.8.0`,
      "README.md": `# TensorFlow GPU Project\n\nThis project is pre-configured with GPU support and CUDA toolkit.\n\n## Getting Started\n\n1. GPU is automatically allocated when you run this project\n2. Run \`python train.py\` to start training\n3. Monitor GPU usage in the Resources panel\n\n## Requirements\n\n- Pro plan (for GPU access)\n- CUDA 12.2 (pre-installed)`,
    },
  },
  {
    name: "PyTorch (GPU)",
    slug: "pytorch-gpu",
    description: "A PyTorch project with GPU support, CUDA toolkit, and sample training notebook",
    language: "python",
    iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg",
    runCommand: "python train.py",
    entryFile: "train.py",
    dockerImage: "pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime",
    gpuSupported: true,
    cudaVersion: "12.1",
    sortOrder: 12,
    filesSnapshot: {
      "train.py": `import torch\nimport torch.nn as nn\nimport torch.optim as optim\nfrom torchvision import datasets, transforms\nfrom torch.utils.data import DataLoader\n\nprint("PyTorch version:", torch.__version__)\nprint("CUDA available:", torch.cuda.is_available())\nif torch.cuda.is_available():\n    print("GPU:", torch.cuda.get_device_name(0))\n    print("CUDA version:", torch.version.cuda)\n\ndevice = torch.device("cuda" if torch.cuda.is_available() else "cpu")\nprint(f"Using device: {device}")\n\n# Simple MNIST classifier\nclass Net(nn.Module):\n    def __init__(self):\n        super(Net, self).__init__()\n        self.fc1 = nn.Linear(784, 128)\n        self.fc2 = nn.Linear(128, 64)\n        self.fc3 = nn.Linear(64, 10)\n        self.dropout = nn.Dropout(0.2)\n\n    def forward(self, x):\n        x = x.view(-1, 784)\n        x = torch.relu(self.fc1(x))\n        x = self.dropout(x)\n        x = torch.relu(self.fc2(x))\n        x = self.fc3(x)\n        return x\n\ntransform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.1307,), (0.3081,))])\ntrain_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)\ntest_dataset = datasets.MNIST('./data', train=False, transform=transform)\ntrain_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)\ntest_loader = DataLoader(test_dataset, batch_size=1000)\n\nmodel = Net().to(device)\noptimizer = optim.Adam(model.parameters(), lr=0.001)\ncriterion = nn.CrossEntropyLoss()\n\nprint("\\nTraining model...")\nfor epoch in range(5):\n    model.train()\n    running_loss = 0.0\n    for batch_idx, (data, target) in enumerate(train_loader):\n        data, target = data.to(device), target.to(device)\n        optimizer.zero_grad()\n        output = model(data)\n        loss = criterion(output, target)\n        loss.backward()\n        optimizer.step()\n        running_loss += loss.item()\n    print(f"Epoch {epoch+1}/5, Loss: {running_loss/len(train_loader):.4f}")\n\nmodel.eval()\ncorrect = 0\ntotal = 0\nwith torch.no_grad():\n    for data, target in test_loader:\n        data, target = data.to(device), target.to(device)\n        output = model(data)\n        _, predicted = torch.max(output, 1)\n        total += target.size(0)\n        correct += (predicted == target).sum().item()\n\nprint(f"\\nTest Accuracy: {100 * correct / total:.2f}%")`,
      "requirements.txt": `torch>=2.3.0\ntorchvision>=0.18.0\nnumpy>=1.26.0\nmatplotlib>=3.8.0`,
      "README.md": `# PyTorch GPU Project\n\nThis project is pre-configured with GPU support and CUDA toolkit.\n\n## Getting Started\n\n1. GPU is automatically allocated when you run this project\n2. Run \`python train.py\` to start training\n3. Monitor GPU usage in the Resources panel\n\n## Requirements\n\n- Pro plan (for GPU access)\n- CUDA 12.1 (pre-installed)`,
    },
  },
];

async function seed() {
  console.log("Seeding templates...");
  for (const template of templates) {
    await db.insert(templatesTable)
      .values(template)
      .onConflictDoUpdate({
        target: templatesTable.slug,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          language: sql`excluded.language`,
          iconUrl: sql`excluded.icon_url`,
          filesSnapshot: sql`excluded.files_snapshot`,
          runCommand: sql`excluded.run_command`,
          entryFile: sql`excluded.entry_file`,
          dockerImage: sql`excluded.docker_image`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }
  console.log(`Seeded ${templates.length} templates.`);
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
