export interface FsEvent {
  id: string;
  type: "create" | "modify" | "delete" | "rename" | "permission";
  path: string;
  oldPath?: string;
  timestamp: string;
  size?: number;
  user: string;
  suspicious: boolean;
  reason?: string;
}

export interface FsRule {
  id: string;
  pattern: string;
  events: string[];
  action: "alert" | "block" | "log";
  enabled: boolean;
}

export interface IntegrityCheck {
  id: string;
  path: string;
  expectedHash: string;
  currentHash: string;
  status: "ok" | "modified" | "missing";
  lastChecked: string;
}

const events: FsEvent[] = [
  { id: "ev1", type: "create", path: "/app/src/utils/helpers.ts", timestamp: new Date(Date.now() - 120000).toISOString(), size: 2450, user: "alice", suspicious: false },
  { id: "ev2", type: "modify", path: "/app/src/index.ts", timestamp: new Date(Date.now() - 300000).toISOString(), size: 8900, user: "bob", suspicious: false },
  { id: "ev3", type: "delete", path: "/app/src/old-config.json", timestamp: new Date(Date.now() - 600000).toISOString(), user: "alice", suspicious: false },
  { id: "ev4", type: "modify", path: "/app/.env", timestamp: new Date(Date.now() - 900000).toISOString(), size: 340, user: "unknown", suspicious: true, reason: "Sensitive file modified by unknown user" },
  { id: "ev5", type: "permission", path: "/app/scripts/deploy.sh", timestamp: new Date(Date.now() - 1200000).toISOString(), user: "root", suspicious: true, reason: "Permission changed to 777 (world-writable)" },
  { id: "ev6", type: "rename", path: "/app/src/api/routes.ts", oldPath: "/app/src/api/old-routes.ts", timestamp: new Date(Date.now() - 1800000).toISOString(), user: "carol", suspicious: false },
  { id: "ev7", type: "create", path: "/app/node_modules/.cache/exploit.js", timestamp: new Date(Date.now() - 2400000).toISOString(), size: 15200, user: "www-data", suspicious: true, reason: "Executable created in cache directory by web user" },
  { id: "ev8", type: "modify", path: "/app/package.json", timestamp: new Date(Date.now() - 3600000).toISOString(), size: 1200, user: "bob", suspicious: false },
  { id: "ev9", type: "create", path: "/app/src/components/Button.tsx", timestamp: new Date(Date.now() - 5400000).toISOString(), size: 3100, user: "alice", suspicious: false },
  { id: "ev10", type: "delete", path: "/tmp/debug.log", timestamp: new Date(Date.now() - 7200000).toISOString(), user: "system", suspicious: false },
];

const rules: FsRule[] = [
  { id: "r1", pattern: "**/.env*", events: ["modify", "delete"], action: "alert", enabled: true },
  { id: "r2", pattern: "**/node_modules/**/*.js", events: ["create", "modify"], action: "alert", enabled: true },
  { id: "r3", pattern: "**/scripts/**", events: ["permission"], action: "block", enabled: true },
  { id: "r4", pattern: "/tmp/**", events: ["create"], action: "log", enabled: false },
];

const integrityChecks: IntegrityCheck[] = [
  { id: "ic1", path: "/app/package.json", expectedHash: "a3f2b8c1", currentHash: "a3f2b8c1", status: "ok", lastChecked: new Date(Date.now() - 60000).toISOString() },
  { id: "ic2", path: "/app/package-lock.json", expectedHash: "d4e5f6a7", currentHash: "d4e5f6a7", status: "ok", lastChecked: new Date(Date.now() - 60000).toISOString() },
  { id: "ic3", path: "/app/.env", expectedHash: "b1c2d3e4", currentHash: "f5a6b7c8", status: "modified", lastChecked: new Date(Date.now() - 60000).toISOString() },
  { id: "ic4", path: "/app/Dockerfile", expectedHash: "e9f0a1b2", currentHash: "e9f0a1b2", status: "ok", lastChecked: new Date(Date.now() - 60000).toISOString() },
  { id: "ic5", path: "/app/scripts/deploy.sh", expectedHash: "c3d4e5f6", currentHash: "", status: "missing", lastChecked: new Date(Date.now() - 60000).toISOString() },
];

export function getEvents(projectId: string): FsEvent[] { return events; }
export function getRules(projectId: string): FsRule[] { return rules; }
export function getIntegrityChecks(projectId: string): IntegrityCheck[] { return integrityChecks; }

export function addRule(projectId: string, rule: Omit<FsRule, "id">): FsRule {
  const r = { ...rule, id: `r${Date.now()}` };
  rules.push(r);
  return r;
}

export function toggleRule(projectId: string, ruleId: string): FsRule | null {
  const r = rules.find(x => x.id === ruleId);
  if (!r) return null;
  r.enabled = !r.enabled;
  return r;
}

export function deleteRule(projectId: string, ruleId: string): boolean {
  const idx = rules.findIndex(x => x.id === ruleId);
  if (idx < 0) return false;
  rules.splice(idx, 1);
  return true;
}
