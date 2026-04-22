export type LanguageKind =
  | "node"
  | "react"
  | "vite"
  | "nextjs"
  | "python"
  | "go"
  | "rust"
  | "ruby"
  | "java"
  | "static"
  | "unknown";

export interface DockerfileSpec {
  language: LanguageKind;
  dockerfile: string;
  exposedPort: number;
  detected: {
    hints: string[];
    hasPackageJson: boolean;
    hasRequirementsTxt: boolean;
    hasGoMod: boolean;
    hasCargoToml: boolean;
    hasGemfile: boolean;
    hasPomXml: boolean;
    hasIndexHtml: boolean;
    framework: string | null;
  };
}

export interface FileEntry {
  path: string;
  content: string | null;
}

export function detectLanguage(files: FileEntry[], hint?: string): {
  kind: LanguageKind;
  framework: string | null;
  hints: string[];
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasGoMod: boolean;
  hasCargoToml: boolean;
  hasGemfile: boolean;
  hasPomXml: boolean;
  hasIndexHtml: boolean;
} {
  const lower = (hint || "").toLowerCase();
  const map = new Map(files.map((f) => [f.path, f.content || ""]));
  const has = (p: string) => map.has(p);

  const hasPackageJson = has("package.json");
  const hasRequirementsTxt = has("requirements.txt") || has("pyproject.toml");
  const hasGoMod = has("go.mod");
  const hasCargoToml = has("Cargo.toml");
  const hasGemfile = has("Gemfile");
  const hasPomXml = has("pom.xml") || has("build.gradle");
  const hasIndexHtml = has("index.html");

  const hints: string[] = [];
  let framework: string | null = null;
  let kind: LanguageKind = "unknown";

  if (hasPackageJson) {
    const pkg = map.get("package.json") || "";
    hints.push("found package.json");
    if (/"next"\s*:/.test(pkg)) {
      kind = "nextjs";
      framework = "Next.js";
    } else if (/"vite"\s*:/.test(pkg)) {
      kind = "vite";
      framework = "Vite";
    } else if (/"react"\s*:/.test(pkg)) {
      kind = "react";
      framework = "React";
    } else {
      kind = "node";
      framework = "Node.js";
    }
  } else if (hasRequirementsTxt) {
    kind = "python";
    framework = "Python";
    hints.push("found requirements.txt or pyproject.toml");
  } else if (hasGoMod) {
    kind = "go";
    framework = "Go";
    hints.push("found go.mod");
  } else if (hasCargoToml) {
    kind = "rust";
    framework = "Rust";
    hints.push("found Cargo.toml");
  } else if (hasGemfile) {
    kind = "ruby";
    framework = "Ruby";
    hints.push("found Gemfile");
  } else if (hasPomXml) {
    kind = "java";
    framework = "Java";
    hints.push("found pom.xml/build.gradle");
  } else if (hasIndexHtml) {
    kind = "static";
    framework = "Static site";
    hints.push("found index.html");
  }

  if (lower.includes("python") && kind === "unknown") kind = "python";
  if (lower.includes("go") && kind === "unknown") kind = "go";
  if (lower.includes("node") && kind === "unknown") kind = "node";

  return {
    kind,
    framework,
    hints,
    hasPackageJson,
    hasRequirementsTxt,
    hasGoMod,
    hasCargoToml,
    hasGemfile,
    hasPomXml,
    hasIndexHtml,
  };
}

export function generateDockerfile(
  files: FileEntry[],
  options: { languageHint?: string; runCommand?: string; entryFile?: string; port?: number } = {},
): DockerfileSpec {
  const detect = detectLanguage(files, options.languageHint);
  const port = options.port || 8080;
  const entry = options.entryFile || "index.js";
  const run = options.runCommand;

  let dockerfile = "";
  switch (detect.kind) {
    case "nextjs":
      dockerfile = nextjsDockerfile(port);
      break;
    case "vite":
    case "react":
      dockerfile = viteDockerfile(port);
      break;
    case "node":
      dockerfile = nodeDockerfile(port, run, entry);
      break;
    case "python":
      dockerfile = pythonDockerfile(port, run, entry);
      break;
    case "go":
      dockerfile = goDockerfile(port);
      break;
    case "rust":
      dockerfile = rustDockerfile(port);
      break;
    case "ruby":
      dockerfile = rubyDockerfile(port);
      break;
    case "java":
      dockerfile = javaDockerfile(port);
      break;
    case "static":
      dockerfile = staticDockerfile(port);
      break;
    default:
      dockerfile = genericDockerfile(port, run);
  }

  return {
    language: detect.kind,
    dockerfile,
    exposedPort: port,
    detected: {
      hints: detect.hints,
      hasPackageJson: detect.hasPackageJson,
      hasRequirementsTxt: detect.hasRequirementsTxt,
      hasGoMod: detect.hasGoMod,
      hasCargoToml: detect.hasCargoToml,
      hasGemfile: detect.hasGemfile,
      hasPomXml: detect.hasPomXml,
      hasIndexHtml: detect.hasIndexHtml,
      framework: detect.framework,
    },
  };
}

function nodeDockerfile(port: number, run?: string, entry?: string): string {
  const startCmd = run ? `["sh", "-c", "${run.replace(/"/g, '\\"')}"]` : `["node", "${entry || "index.js"}"]`;
  return `# Multi-stage build: Node.js
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE ${port}
USER node
CMD ${startCmd}
`;
}

function viteDockerfile(port: number): string {
  return `# Multi-stage build: Vite/React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
RUN sed -i "s/listen\\s*80/listen ${port}/" /etc/nginx/conf.d/default.conf
EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]
`;
}

function nextjsDockerfile(port: number): string {
  return `# Multi-stage build: Next.js
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE ${port}
USER node
CMD ["npm", "start"]
`;
}

function pythonDockerfile(port: number, run?: string, entry?: string): string {
  const startCmd = run ? `["sh", "-c", "${run.replace(/"/g, '\\"')}"]` : `["python", "${entry || "main.py"}"]`;
  return `# Multi-stage build: Python
FROM python:3.12-slim AS deps
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt || true

FROM python:3.12-slim AS runner
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PORT=${port}
ENV PATH=/root/.local/bin:$PATH
COPY --from=deps /root/.local /root/.local
COPY . .
EXPOSE ${port}
CMD ${startCmd}
`;
}

function goDockerfile(port: number): string {
  return `# Multi-stage build: Go
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/app ./...

FROM gcr.io/distroless/static:nonroot AS runner
WORKDIR /
COPY --from=builder /out/app /app
ENV PORT=${port}
EXPOSE ${port}
USER nonroot:nonroot
ENTRYPOINT ["/app"]
`;
}

function rustDockerfile(port: number): string {
  return `# Multi-stage build: Rust
FROM rust:1.81-alpine AS builder
WORKDIR /src
RUN apk add --no-cache musl-dev
COPY Cargo.* ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.20 AS runner
WORKDIR /
COPY --from=builder /src/target/release/app /app
ENV PORT=${port}
EXPOSE ${port}
ENTRYPOINT ["/app"]
`;
}

function rubyDockerfile(port: number): string {
  return `# Multi-stage build: Ruby
FROM ruby:3.3-alpine AS deps
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test

FROM ruby:3.3-alpine AS runner
WORKDIR /app
ENV PORT=${port}
COPY --from=deps /usr/local/bundle /usr/local/bundle
COPY . .
EXPOSE ${port}
CMD ["bundle", "exec", "rackup", "--host", "0.0.0.0", "--port", "${port}"]
`;
}

function javaDockerfile(port: number): string {
  return `# Multi-stage build: Java
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /src
COPY . .
RUN ./mvnw -B package -DskipTests || mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app
COPY --from=builder /src/target/*.jar /app/app.jar
ENV PORT=${port}
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
`;
}

function staticDockerfile(port: number): string {
  return `# Static site served via nginx
FROM nginx:1.27-alpine
COPY . /usr/share/nginx/html
RUN sed -i "s/listen\\s*80/listen ${port}/" /etc/nginx/conf.d/default.conf
EXPOSE ${port}
CMD ["nginx", "-g", "daemon off;"]
`;
}

function genericDockerfile(port: number, run?: string): string {
  const cmd = run ? `["sh", "-c", "${run.replace(/"/g, '\\"')}"]` : `["sh", "-c", "echo No run command configured && sleep infinity"]`;
  return `# Generic container
FROM alpine:3.20
WORKDIR /app
COPY . .
ENV PORT=${port}
EXPOSE ${port}
CMD ${cmd}
`;
}

export type ResourceTier = "free" | "starter" | "pro" | "team" | "enterprise";

export interface ResourceAllocation {
  tier: ResourceTier;
  memoryMb: number;
  cpuMillicores: number;
  minInstances: number;
  maxInstances: number;
  concurrency: number;
}

export function allocateResources(tier: ResourceTier | string | null | undefined): ResourceAllocation {
  const t = (tier || "free") as ResourceTier;
  const table: Record<ResourceTier, Omit<ResourceAllocation, "tier">> = {
    free: { memoryMb: 256, cpuMillicores: 250, minInstances: 0, maxInstances: 1, concurrency: 40 },
    starter: { memoryMb: 512, cpuMillicores: 500, minInstances: 0, maxInstances: 2, concurrency: 80 },
    pro: { memoryMb: 1024, cpuMillicores: 1000, minInstances: 1, maxInstances: 5, concurrency: 100 },
    team: { memoryMb: 2048, cpuMillicores: 2000, minInstances: 1, maxInstances: 10, concurrency: 150 },
    enterprise: { memoryMb: 4096, cpuMillicores: 4000, minInstances: 2, maxInstances: 50, concurrency: 250 },
  };
  const alloc = table[t] || table.free;
  return { tier: t, ...alloc };
}
