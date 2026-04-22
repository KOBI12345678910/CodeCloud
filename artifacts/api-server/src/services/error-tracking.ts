export interface TrackedError {
  id: string;
  projectId: string;
  deploymentId?: string;
  message: string;
  stack: string;
  fingerprint: string;
  level: "error" | "warning" | "fatal";
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: "unresolved" | "resolved" | "ignored" | "regressed";
  affectedUsers: number;
  browser?: string;
  os?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: "unresolved" | "resolved" | "ignored" | "regressed";
  affectedUsers: number;
  errors: TrackedError[];
  trend: number[];
}

export interface ErrorStats {
  totalErrors: number;
  unresolvedCount: number;
  resolvedCount: number;
  ignoredCount: number;
  errorRate: number;
  topErrors: ErrorGroup[];
  hourlyBreakdown: { hour: string; count: number }[];
  browserBreakdown: { browser: string; count: number; percentage: number }[];
  affectedDeployments: { deploymentId: string; errorCount: number }[];
}

function generateFingerprint(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

const SAMPLE_MESSAGES = [
  "TypeError: Cannot read properties of undefined (reading 'map')",
  "ReferenceError: process is not defined",
  "SyntaxError: Unexpected token '<' in JSON at position 0",
  "Error: ENOENT: no such file or directory",
  "NetworkError: Failed to fetch",
  "RangeError: Maximum call stack size exceeded",
  "Error: Request timeout after 30000ms",
  "TypeError: null is not an object (evaluating 'response.data')",
  "Error: CORS policy blocked request",
  "UnhandledPromiseRejection: Connection refused",
];

const BROWSERS = ["Chrome 120", "Firefox 121", "Safari 17", "Edge 120", "Mobile Safari", "Chrome Mobile"];
const OS_LIST = ["Windows 11", "macOS 14", "Ubuntu 22.04", "iOS 17", "Android 14"];

function generateSampleErrors(projectId: string, count: number): TrackedError[] {
  const errors: TrackedError[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const message = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
    const hoursAgo = Math.floor(Math.random() * 168);
    const firstSeenHoursAgo = hoursAgo + Math.floor(Math.random() * 72);

    errors.push({
      id: crypto.randomUUID(),
      projectId,
      deploymentId: `deploy-${Math.floor(Math.random() * 10) + 1}`,
      message,
      stack: `${message}\n    at Object.<anonymous> (src/index.ts:${Math.floor(Math.random() * 200) + 1}:${Math.floor(Math.random() * 40) + 1})\n    at Module._compile (node:internal/modules/cjs/loader:1241:14)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)`,
      fingerprint: generateFingerprint(message),
      level: Math.random() > 0.8 ? "fatal" : Math.random() > 0.3 ? "error" : "warning",
      count: Math.floor(Math.random() * 500) + 1,
      firstSeen: new Date(now - firstSeenHoursAgo * 3600000).toISOString(),
      lastSeen: new Date(now - hoursAgo * 3600000).toISOString(),
      status: Math.random() > 0.6 ? "unresolved" : Math.random() > 0.5 ? "resolved" : Math.random() > 0.5 ? "ignored" : "regressed",
      affectedUsers: Math.floor(Math.random() * 1000) + 1,
      browser: BROWSERS[Math.floor(Math.random() * BROWSERS.length)],
      os: OS_LIST[Math.floor(Math.random() * OS_LIST.length)],
      url: `/app/${["dashboard", "settings", "profile", "projects", "billing"][Math.floor(Math.random() * 5)]}`,
    });
  }

  return errors;
}

export function getErrorStats(projectId: string): ErrorStats {
  const errors = generateSampleErrors(projectId, 50);
  const grouped = new Map<string, ErrorGroup>();

  for (const err of errors) {
    const existing = grouped.get(err.fingerprint);
    if (existing) {
      existing.count += err.count;
      existing.affectedUsers += err.affectedUsers;
      existing.errors.push(err);
      if (err.lastSeen > existing.lastSeen) existing.lastSeen = err.lastSeen;
      if (err.firstSeen < existing.firstSeen) existing.firstSeen = err.firstSeen;
    } else {
      grouped.set(err.fingerprint, {
        fingerprint: err.fingerprint,
        message: err.message,
        count: err.count,
        firstSeen: err.firstSeen,
        lastSeen: err.lastSeen,
        status: err.status,
        affectedUsers: err.affectedUsers,
        errors: [err],
        trend: Array.from({ length: 24 }, () => Math.floor(Math.random() * 20)),
      });
    }
  }

  const groups = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  const totalErrors = errors.reduce((s, e) => s + e.count, 0);

  const hourlyBreakdown = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(Date.now() - (23 - i) * 3600000);
    return { hour: hour.toISOString(), count: Math.floor(Math.random() * 100) + 5 };
  });

  const browserCounts = new Map<string, number>();
  for (const err of errors) {
    if (err.browser) browserCounts.set(err.browser, (browserCounts.get(err.browser) || 0) + err.count);
  }
  const browserBreakdown = Array.from(browserCounts.entries()).map(([browser, count]) => ({ browser, count, percentage: Math.round((count / totalErrors) * 100) })).sort((a, b) => b.count - a.count);

  const deploymentCounts = new Map<string, number>();
  for (const err of errors) {
    if (err.deploymentId) deploymentCounts.set(err.deploymentId, (deploymentCounts.get(err.deploymentId) || 0) + err.count);
  }

  return {
    totalErrors,
    unresolvedCount: errors.filter(e => e.status === "unresolved").reduce((s, e) => s + e.count, 0),
    resolvedCount: errors.filter(e => e.status === "resolved").reduce((s, e) => s + e.count, 0),
    ignoredCount: errors.filter(e => e.status === "ignored").reduce((s, e) => s + e.count, 0),
    errorRate: Math.round(Math.random() * 500) / 100,
    topErrors: groups.slice(0, 10),
    hourlyBreakdown,
    browserBreakdown,
    affectedDeployments: Array.from(deploymentCounts.entries()).map(([deploymentId, errorCount]) => ({ deploymentId, errorCount })).sort((a, b) => b.errorCount - a.errorCount),
  };
}

export function resolveError(fingerprint: string): { success: boolean; fingerprint: string; status: string } {
  return { success: true, fingerprint, status: "resolved" };
}

export function ignoreError(fingerprint: string): { success: boolean; fingerprint: string; status: string } {
  return { success: true, fingerprint, status: "ignored" };
}

export function getErrorDetails(projectId: string, fingerprint: string): ErrorGroup | null {
  const stats = getErrorStats(projectId);
  return stats.topErrors.find(g => g.fingerprint === fingerprint) || null;
}
