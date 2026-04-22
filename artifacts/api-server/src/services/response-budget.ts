export interface EndpointBudget {
  id: string;
  endpoint: string;
  method: string;
  targetMs: number;
  p50: number;
  p95: number;
  p99: number;
  requestCount: number;
  budgetExceeded: boolean;
  trend: number[];
  lastUpdated: string;
}

export interface BudgetAlert {
  id: string;
  endpointId: string;
  endpoint: string;
  percentile: string;
  targetMs: number;
  actualMs: number;
  severity: "warning" | "critical";
  triggeredAt: string;
  acknowledged: boolean;
}

const budgets: EndpointBudget[] = [
  { id: "b1", endpoint: "/api/auth/login", method: "POST", targetMs: 200, p50: 145, p95: 210, p99: 380, requestCount: 12450, budgetExceeded: true, trend: [120, 135, 150, 148, 160, 145, 155], lastUpdated: new Date(Date.now() - 60000).toISOString() },
  { id: "b2", endpoint: "/api/projects", method: "GET", targetMs: 150, p50: 82, p95: 130, p99: 148, requestCount: 34200, budgetExceeded: false, trend: [90, 85, 80, 78, 82, 84, 82], lastUpdated: new Date(Date.now() - 60000).toISOString() },
  { id: "b3", endpoint: "/api/projects/:id/files", method: "GET", targetMs: 300, p50: 190, p95: 420, p99: 680, requestCount: 28900, budgetExceeded: true, trend: [180, 200, 210, 250, 220, 190, 195], lastUpdated: new Date(Date.now() - 60000).toISOString() },
  { id: "b4", endpoint: "/api/deploy", method: "POST", targetMs: 500, p50: 320, p95: 480, p99: 510, requestCount: 1890, budgetExceeded: true, trend: [300, 310, 330, 350, 340, 320, 315], lastUpdated: new Date(Date.now() - 60000).toISOString() },
  { id: "b5", endpoint: "/api/users/profile", method: "GET", targetMs: 100, p50: 45, p95: 78, p99: 95, requestCount: 45600, budgetExceeded: false, trend: [50, 48, 45, 42, 44, 46, 45], lastUpdated: new Date(Date.now() - 60000).toISOString() },
  { id: "b6", endpoint: "/api/containers/:id/exec", method: "POST", targetMs: 1000, p50: 450, p95: 890, p99: 1200, requestCount: 5670, budgetExceeded: true, trend: [400, 420, 460, 480, 470, 450, 440], lastUpdated: new Date(Date.now() - 60000).toISOString() },
  { id: "b7", endpoint: "/api/search", method: "GET", targetMs: 250, p50: 120, p95: 230, p99: 245, requestCount: 18900, budgetExceeded: false, trend: [130, 125, 118, 122, 120, 119, 120], lastUpdated: new Date(Date.now() - 60000).toISOString() },
];

const alerts: BudgetAlert[] = [
  { id: "a1", endpointId: "b1", endpoint: "/api/auth/login", percentile: "p95", targetMs: 200, actualMs: 210, severity: "warning", triggeredAt: new Date(Date.now() - 1800000).toISOString(), acknowledged: false },
  { id: "a2", endpointId: "b3", endpoint: "/api/projects/:id/files", percentile: "p95", targetMs: 300, actualMs: 420, severity: "critical", triggeredAt: new Date(Date.now() - 3600000).toISOString(), acknowledged: false },
  { id: "a3", endpointId: "b3", endpoint: "/api/projects/:id/files", percentile: "p99", targetMs: 300, actualMs: 680, severity: "critical", triggeredAt: new Date(Date.now() - 3600000).toISOString(), acknowledged: true },
  { id: "a4", endpointId: "b4", endpoint: "/api/deploy", percentile: "p99", targetMs: 500, actualMs: 510, severity: "warning", triggeredAt: new Date(Date.now() - 7200000).toISOString(), acknowledged: false },
  { id: "a5", endpointId: "b6", endpoint: "/api/containers/:id/exec", percentile: "p99", targetMs: 1000, actualMs: 1200, severity: "critical", triggeredAt: new Date(Date.now() - 900000).toISOString(), acknowledged: false },
];

export function getBudgets(): EndpointBudget[] { return budgets; }
export function getAlerts(): BudgetAlert[] { return alerts; }

export function updateBudget(id: string, targetMs: number): EndpointBudget | null {
  const b = budgets.find(x => x.id === id);
  if (!b) return null;
  b.targetMs = targetMs;
  b.budgetExceeded = b.p95 > targetMs || b.p99 > targetMs;
  return b;
}

export function acknowledgeAlert(id: string): BudgetAlert | null {
  const a = alerts.find(x => x.id === id);
  if (!a) return null;
  a.acknowledged = true;
  return a;
}
