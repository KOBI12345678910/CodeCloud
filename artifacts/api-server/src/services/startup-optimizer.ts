export interface StartupAnalysis {
  id: string;
  containerId: string;
  projectId: string;
  totalStartupMs: number;
  phases: StartupPhase[];
  recommendations: StartupRecommendation[];
  layerCaching: LayerCacheAnalysis;
  benchmarks: StartupBenchmark[];
  analyzedAt: string;
}

export interface StartupPhase {
  name: string;
  durationMs: number;
  percentage: number;
  parallel: boolean;
  dependencies: string[];
  optimizable: boolean;
}

export interface StartupRecommendation {
  type: "parallel" | "caching" | "lazy-load" | "reduce" | "reorder";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  estimatedSavingMs: number;
  before?: string;
  after?: string;
}

export interface LayerCacheAnalysis {
  totalLayers: number;
  cachedLayers: number;
  cacheHitRate: number;
  uncachedSizeBytes: number;
  suggestions: string[];
}

export interface StartupBenchmark {
  id: string;
  label: string;
  coldStartMs: number;
  warmStartMs: number;
  avgStartMs: number;
  timestamp: string;
}

const analyses: Map<string, StartupAnalysis> = new Map();

function generateAnalysis(containerId: string, projectId: string): StartupAnalysis {
  const phases: StartupPhase[] = [
    { name: "Image Pull", durationMs: 2400, percentage: 18.5, parallel: false, dependencies: [], optimizable: true },
    { name: "Layer Extraction", durationMs: 1800, percentage: 13.9, parallel: false, dependencies: ["Image Pull"], optimizable: true },
    { name: "Network Setup", durationMs: 350, percentage: 2.7, parallel: true, dependencies: ["Layer Extraction"], optimizable: false },
    { name: "Volume Mount", durationMs: 520, percentage: 4.0, parallel: true, dependencies: ["Layer Extraction"], optimizable: true },
    { name: "Dependency Install", durationMs: 3200, percentage: 24.7, parallel: false, dependencies: ["Layer Extraction"], optimizable: true },
    { name: "Config Load", durationMs: 180, percentage: 1.4, parallel: true, dependencies: ["Volume Mount"], optimizable: false },
    { name: "DB Migration", durationMs: 1400, percentage: 10.8, parallel: false, dependencies: ["Dependency Install", "Config Load"], optimizable: true },
    { name: "Cache Warmup", durationMs: 890, percentage: 6.9, parallel: true, dependencies: ["DB Migration"], optimizable: true },
    { name: "Health Check Wait", durationMs: 1200, percentage: 9.3, parallel: false, dependencies: ["Cache Warmup"], optimizable: true },
    { name: "Service Registration", durationMs: 320, percentage: 2.5, parallel: true, dependencies: ["Health Check Wait"], optimizable: false },
    { name: "Traffic Routing", durationMs: 690, percentage: 5.3, parallel: false, dependencies: ["Service Registration"], optimizable: true },
  ];

  const totalMs = phases.reduce((s, p) => s + p.durationMs, 0);

  const recommendations: StartupRecommendation[] = [
    {
      type: "parallel", severity: "critical", title: "Parallelize dependency installation",
      description: "Dependencies are installed sequentially. Use multi-stage builds to pre-install and cache dependencies separately from application code.",
      estimatedSavingMs: 1800,
      before: "RUN npm install\nCOPY . .\nRUN npm run build",
      after: "COPY package*.json ./\nRUN npm ci --production\nCOPY . .\nRUN npm run build",
    },
    {
      type: "caching", severity: "warning", title: "Improve layer caching strategy",
      description: "Frequently changing layers invalidate the cache. Move rarely-changing dependencies to earlier layers.",
      estimatedSavingMs: 1200,
    },
    {
      type: "lazy-load", severity: "warning", title: "Defer cache warmup to post-startup",
      description: "Cache warmup blocks startup. Lazy-load caches on first request instead of at boot time.",
      estimatedSavingMs: 890,
    },
    {
      type: "reduce", severity: "info", title: "Optimize health check interval",
      description: "Health check waits 1.2s with 400ms intervals. Reduce initial delay and interval for faster readiness.",
      estimatedSavingMs: 600,
    },
    {
      type: "reorder", severity: "info", title: "Run migrations during build phase",
      description: "Database migrations can run as a separate init container to avoid blocking main container startup.",
      estimatedSavingMs: 1400,
    },
  ];

  const benchmarks: StartupBenchmark[] = [
    { id: "b1", label: "Baseline", coldStartMs: totalMs, warmStartMs: 4200, avgStartMs: 8500, timestamp: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: "b2", label: "After layer optimization", coldStartMs: totalMs - 1200, warmStartMs: 3800, avgStartMs: 7200, timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: "b3", label: "After parallel deps", coldStartMs: totalMs - 3000, warmStartMs: 3200, avgStartMs: 5800, timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: "b4", label: "After lazy cache", coldStartMs: totalMs - 3890, warmStartMs: 2800, avgStartMs: 4900, timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: "b5", label: "Current", coldStartMs: totalMs, warmStartMs: 4200, avgStartMs: 8500, timestamp: new Date().toISOString() },
  ];

  return {
    id: `sa_${Date.now()}`, containerId, projectId, totalStartupMs: totalMs,
    phases, recommendations, benchmarks, analyzedAt: new Date().toISOString(),
    layerCaching: {
      totalLayers: 8, cachedLayers: 5, cacheHitRate: 62.5,
      uncachedSizeBytes: 45000000,
      suggestions: [
        "Move COPY package*.json before COPY . to leverage layer cache",
        "Pin base image version to avoid cache invalidation",
        "Use .dockerignore to exclude test files and docs from COPY",
      ],
    },
  };
}

export class StartupOptimizerService {
  async analyze(containerId: string, projectId: string): Promise<StartupAnalysis> {
    const analysis = generateAnalysis(containerId, projectId);
    analyses.set(containerId, analysis);
    return analysis;
  }

  async getAnalysis(containerId: string): Promise<StartupAnalysis | null> {
    return analyses.get(containerId) || null;
  }

  async getBenchmarks(containerId: string): Promise<StartupBenchmark[]> {
    const a = analyses.get(containerId);
    return a ? a.benchmarks : [];
  }

  async addBenchmark(containerId: string, label: string): Promise<StartupBenchmark | null> {
    const a = analyses.get(containerId);
    if (!a) return null;
    const bm: StartupBenchmark = {
      id: `b${Date.now()}`, label,
      coldStartMs: a.totalStartupMs * (0.8 + Math.random() * 0.4),
      warmStartMs: a.totalStartupMs * (0.3 + Math.random() * 0.2),
      avgStartMs: a.totalStartupMs * (0.5 + Math.random() * 0.3),
      timestamp: new Date().toISOString(),
    };
    a.benchmarks.push(bm);
    return bm;
  }

  async getRecommendations(containerId: string): Promise<StartupRecommendation[]> {
    const a = analyses.get(containerId);
    return a ? a.recommendations : [];
  }
}

export const startupOptimizerService = new StartupOptimizerService();
