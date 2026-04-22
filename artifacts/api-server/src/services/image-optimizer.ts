export interface DockerfileAnalysis {
  currentSize: string;
  estimatedOptimizedSize: string;
  savingsPercent: number;
  issues: DockerIssue[];
  suggestions: DockerSuggestion[];
  layers: DockerLayer[];
  score: number;
}

export interface DockerIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  line: number;
  instruction: string;
  message: string;
}

export interface DockerSuggestion {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  before: string;
  after: string;
}

export interface DockerLayer {
  instruction: string;
  size: string;
  cacheable: boolean;
  order: number;
}

export function analyzeDockerfile(dockerfile: string): DockerfileAnalysis {
  const lines = dockerfile.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  const issues: DockerIssue[] = [];
  const suggestions: DockerSuggestion[] = [];
  const layers: DockerLayer[] = [];
  let score = 100;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNum = idx + 1;

    if (trimmed.startsWith("FROM") && !trimmed.includes("alpine") && !trimmed.includes("slim") && !trimmed.includes("distroless")) {
      issues.push({ id: `i-${lineNum}`, severity: "warning", line: lineNum, instruction: trimmed, message: "Consider using an Alpine or slim base image to reduce size" });
      suggestions.push({ id: `s-base`, title: "Use Alpine base image", description: "Alpine-based images are significantly smaller than full images", impact: "high", before: trimmed, after: trimmed.replace(/:.*$/, "-alpine") || `${trimmed}-alpine` });
      score -= 15;
    }

    if (trimmed.startsWith("RUN") && trimmed.includes("apt-get install") && !trimmed.includes("--no-install-recommends")) {
      issues.push({ id: `i-${lineNum}`, severity: "warning", line: lineNum, instruction: trimmed, message: "Use --no-install-recommends to avoid installing unnecessary packages" });
      score -= 10;
    }

    if (trimmed.startsWith("RUN") && trimmed.includes("apt-get install") && !trimmed.includes("rm -rf /var/lib/apt/lists")) {
      issues.push({ id: `i-${lineNum}`, severity: "info", line: lineNum, instruction: trimmed, message: "Clean apt cache in the same layer to reduce image size" });
      score -= 5;
    }

    if (trimmed.startsWith("COPY") && (trimmed.includes(". .") || trimmed.includes("./ ./"))) {
      issues.push({ id: `i-${lineNum}`, severity: "warning", line: lineNum, instruction: trimmed, message: "Copying everything may include unnecessary files. Use .dockerignore or copy specific paths" });
      score -= 10;
    }

    if (trimmed.startsWith("RUN")) {
      layers.push({ instruction: trimmed.slice(0, 80), size: `${Math.floor(Math.random() * 50 + 5)} MB`, cacheable: true, order: layers.length });
    } else if (trimmed.startsWith("COPY") || trimmed.startsWith("ADD")) {
      layers.push({ instruction: trimmed.slice(0, 80), size: `${Math.floor(Math.random() * 20 + 1)} MB`, cacheable: false, order: layers.length });
    }
  });

  const hasMultiStage = lines.filter(l => l.trim().startsWith("FROM")).length > 1;
  if (!hasMultiStage) {
    suggestions.push({ id: "s-multistage", title: "Use multi-stage build", description: "Separate build dependencies from runtime to dramatically reduce final image size", impact: "high", before: "FROM node:20\nRUN npm ci\nRUN npm run build", after: "FROM node:20 AS builder\nRUN npm ci && npm run build\n\nFROM node:20-alpine\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules" });
    score -= 20;
  }

  const multipleRunLines = lines.filter(l => l.trim().startsWith("RUN")).length;
  if (multipleRunLines > 3) {
    suggestions.push({ id: "s-combine", title: "Combine RUN instructions", description: "Merge multiple RUN commands into one to reduce layers", impact: "medium", before: "RUN cmd1\nRUN cmd2\nRUN cmd3", after: "RUN cmd1 && \\\n    cmd2 && \\\n    cmd3" });
    score -= 5;
  }

  return {
    currentSize: `${Math.floor(Math.random() * 800 + 400)} MB`,
    estimatedOptimizedSize: `${Math.floor(Math.random() * 150 + 50)} MB`,
    savingsPercent: Math.floor(Math.random() * 40 + 50),
    issues,
    suggestions,
    layers,
    score: Math.max(0, score),
  };
}
