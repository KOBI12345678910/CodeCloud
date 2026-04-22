export interface MirrorConfig {
  id: string;
  sourceEnv: string;
  targetEnv: string;
  enabled: boolean;
  sampleRate: number;
  createdAt: string;
  filters: { pathPattern: string; methods: string[] }[];
}

export interface MirrorSession {
  id: string;
  configId: string;
  status: "active" | "paused" | "completed";
  startedAt: string;
  endedAt?: string;
  stats: MirrorStats;
}

export interface MirrorStats {
  totalRequests: number;
  mirrored: number;
  matched: number;
  mismatched: number;
  errors: number;
  avgLatencyDiffMs: number;
}

export interface MirrorComparison {
  id: string;
  sessionId: string;
  path: string;
  method: string;
  timestamp: string;
  source: { status: number; latencyMs: number; bodyHash: string };
  target: { status: number; latencyMs: number; bodyHash: string };
  match: boolean;
  diffSummary?: string;
}

const configs: MirrorConfig[] = [
  { id: "mc-1", sourceEnv: "production", targetEnv: "staging", enabled: true, sampleRate: 10, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), filters: [{ pathPattern: "/api/*", methods: ["GET", "POST"] }] },
  { id: "mc-2", sourceEnv: "production", targetEnv: "canary", enabled: false, sampleRate: 5, createdAt: new Date(Date.now() - 86400000).toISOString(), filters: [{ pathPattern: "/api/v2/*", methods: ["GET"] }] },
];

const sessions: MirrorSession[] = [
  { id: "ms-1", configId: "mc-1", status: "active", startedAt: new Date(Date.now() - 3600000 * 2).toISOString(), stats: { totalRequests: 4820, mirrored: 482, matched: 461, mismatched: 15, errors: 6, avgLatencyDiffMs: 12.4 } },
  { id: "ms-2", configId: "mc-1", status: "completed", startedAt: new Date(Date.now() - 86400000).toISOString(), endedAt: new Date(Date.now() - 43200000).toISOString(), stats: { totalRequests: 28400, mirrored: 2840, matched: 2790, mismatched: 38, errors: 12, avgLatencyDiffMs: 8.7 } },
];

const comparisons: MirrorComparison[] = [
  { id: "cmp-1", sessionId: "ms-1", path: "/api/users", method: "GET", timestamp: new Date(Date.now() - 60000).toISOString(), source: { status: 200, latencyMs: 45, bodyHash: "a1b2c3" }, target: { status: 200, latencyMs: 52, bodyHash: "a1b2c3" }, match: true },
  { id: "cmp-2", sessionId: "ms-1", path: "/api/projects", method: "GET", timestamp: new Date(Date.now() - 120000).toISOString(), source: { status: 200, latencyMs: 89, bodyHash: "d4e5f6" }, target: { status: 200, latencyMs: 95, bodyHash: "d4e5f6" }, match: true },
  { id: "cmp-3", sessionId: "ms-1", path: "/api/deploy", method: "POST", timestamp: new Date(Date.now() - 180000).toISOString(), source: { status: 200, latencyMs: 210, bodyHash: "g7h8i9" }, target: { status: 500, latencyMs: 310, bodyHash: "x0y0z0" }, match: false, diffSummary: "Target returned 500: NullPointerException in DeployService.validate()" },
  { id: "cmp-4", sessionId: "ms-1", path: "/api/billing", method: "GET", timestamp: new Date(Date.now() - 300000).toISOString(), source: { status: 200, latencyMs: 32, bodyHash: "j1k2l3" }, target: { status: 200, latencyMs: 128, bodyHash: "j1k2l3" }, match: true, diffSummary: "Response matched but target 3x slower" },
  { id: "cmp-5", sessionId: "ms-1", path: "/api/search", method: "POST", timestamp: new Date(Date.now() - 400000).toISOString(), source: { status: 200, latencyMs: 67, bodyHash: "m4n5o6" }, target: { status: 200, latencyMs: 71, bodyHash: "p7q8r9" }, match: false, diffSummary: "Different result ordering in search response" },
];

export function getConfigs(): MirrorConfig[] { return configs; }
export function getSessions(): MirrorSession[] { return sessions; }
export function getComparisons(sessionId: string): MirrorComparison[] { return comparisons.filter(c => c.sessionId === sessionId); }

export function toggleConfig(id: string): MirrorConfig | null {
  const cfg = configs.find(c => c.id === id);
  if (cfg) cfg.enabled = !cfg.enabled;
  return cfg || null;
}

export function updateSampleRate(id: string, rate: number): MirrorConfig | null {
  const cfg = configs.find(c => c.id === id);
  if (cfg) cfg.sampleRate = Math.max(1, Math.min(100, rate));
  return cfg || null;
}
