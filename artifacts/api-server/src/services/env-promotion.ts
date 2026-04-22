export interface PromotionPipeline {
  environments: Environment[];
  promotions: Promotion[];
}

export interface Environment {
  id: string;
  name: string;
  order: number;
  currentBuild: string;
  buildAt: string;
  status: "healthy" | "degraded" | "down";
  config: Record<string, string>;
}

export interface Promotion {
  id: string;
  fromEnv: string;
  toEnv: string;
  build: string;
  status: "pending" | "approved" | "rejected" | "promoting" | "completed" | "rolled_back";
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  completedAt?: string;
  checks: PromotionCheck[];
}

export interface PromotionCheck {
  name: string;
  status: "pass" | "fail" | "pending" | "skipped";
  details: string;
}

const environments: Environment[] = [
  { id: "env-dev", name: "Development", order: 0, currentBuild: "v2.4.3-dev.42", buildAt: new Date(Date.now() - 3600000).toISOString(), status: "healthy", config: { LOG_LEVEL: "debug", FEATURE_FLAGS: "all", DB_POOL: "5" } },
  { id: "env-staging", name: "Staging", order: 1, currentBuild: "v2.4.2", buildAt: new Date(Date.now() - 86400000).toISOString(), status: "healthy", config: { LOG_LEVEL: "info", FEATURE_FLAGS: "beta", DB_POOL: "10" } },
  { id: "env-prod", name: "Production", order: 2, currentBuild: "v2.4.1", buildAt: new Date(Date.now() - 3 * 86400000).toISOString(), status: "healthy", config: { LOG_LEVEL: "warn", FEATURE_FLAGS: "stable", DB_POOL: "50" } },
];

const promotions: Promotion[] = [
  {
    id: "promo-1", fromEnv: "Development", toEnv: "Staging", build: "v2.4.3-dev.42", status: "pending",
    requestedBy: "alice@codecloud.dev", requestedAt: new Date(Date.now() - 1800000).toISOString(),
    checks: [
      { name: "Unit Tests", status: "pass", details: "342/342 passed" },
      { name: "Integration Tests", status: "pass", details: "89/89 passed" },
      { name: "Security Scan", status: "pass", details: "No vulnerabilities found" },
      { name: "Code Review", status: "pending", details: "Awaiting reviewer approval" },
    ],
  },
  {
    id: "promo-2", fromEnv: "Staging", toEnv: "Production", build: "v2.4.2", status: "approved",
    requestedBy: "bob@codecloud.dev", requestedAt: new Date(Date.now() - 7200000).toISOString(),
    approvedBy: "carol@codecloud.dev", approvedAt: new Date(Date.now() - 3600000).toISOString(),
    checks: [
      { name: "Unit Tests", status: "pass", details: "342/342 passed" },
      { name: "Integration Tests", status: "pass", details: "89/89 passed" },
      { name: "Security Scan", status: "pass", details: "No vulnerabilities found" },
      { name: "Load Test", status: "pass", details: "p99 < 200ms at 1000 RPS" },
      { name: "Staging Soak", status: "pass", details: "24h soak test passed, 0 errors" },
    ],
  },
  {
    id: "promo-3", fromEnv: "Development", toEnv: "Staging", build: "v2.4.1-dev.38", status: "completed",
    requestedBy: "alice@codecloud.dev", requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    approvedBy: "bob@codecloud.dev", approvedAt: new Date(Date.now() - 5 * 86400000 + 3600000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 86400000 + 7200000).toISOString(),
    checks: [
      { name: "Unit Tests", status: "pass", details: "338/338 passed" },
      { name: "Integration Tests", status: "pass", details: "87/87 passed" },
      { name: "Security Scan", status: "pass", details: "Clean" },
      { name: "Code Review", status: "pass", details: "Approved by carol" },
    ],
  },
];

export function getPipeline(): PromotionPipeline { return { environments, promotions }; }

export function approvePromotion(id: string, approver: string): Promotion | null {
  const p = promotions.find(x => x.id === id);
  if (!p || p.status !== "pending") return null;
  p.status = "approved";
  p.approvedBy = approver;
  p.approvedAt = new Date().toISOString();
  return p;
}

export function rejectPromotion(id: string): Promotion | null {
  const p = promotions.find(x => x.id === id);
  if (!p || p.status !== "pending") return null;
  p.status = "rejected";
  return p;
}

export function executePromotion(id: string): Promotion | null {
  const p = promotions.find(x => x.id === id);
  if (!p || p.status !== "approved") return null;
  p.status = "promoting";
  setTimeout(() => {
    p.status = "completed";
    p.completedAt = new Date().toISOString();
    const target = environments.find(e => e.name === p.toEnv);
    if (target) { target.currentBuild = p.build; target.buildAt = new Date().toISOString(); }
  }, 3000);
  return p;
}

export function rollbackPromotion(id: string): Promotion | null {
  const p = promotions.find(x => x.id === id);
  if (!p || p.status !== "completed") return null;
  p.status = "rolled_back";
  return p;
}
