export interface TimeoutConfig {
  id: string;
  pattern: string;
  timeout: number;
  gracePeriod: number;
  action: "terminate" | "kill" | "notify";
  enabled: boolean;
}

export interface RunningExec {
  id: string;
  command: string;
  pid: number;
  startedAt: string;
  elapsed: number;
  timeout: number;
  status: "running" | "grace_period" | "timed_out" | "killed";
  userId: string;
}

export interface TimeoutEvent {
  id: string;
  command: string;
  action: "graceful_term" | "force_kill" | "alert_sent" | "completed";
  timestamp: string;
  elapsed: number;
  timeout: number;
  exitCode: number | null;
}

export function getTimeoutConfigs(projectId: string): TimeoutConfig[] {
  return [
    { id: "tc1", pattern: "npm install*", timeout: 300, gracePeriod: 30, action: "terminate", enabled: true },
    { id: "tc2", pattern: "npm run build*", timeout: 600, gracePeriod: 60, action: "terminate", enabled: true },
    { id: "tc3", pattern: "npm test*", timeout: 120, gracePeriod: 15, action: "kill", enabled: true },
    { id: "tc4", pattern: "*", timeout: 3600, gracePeriod: 60, action: "notify", enabled: true },
  ];
}

export function getRunningExecs(projectId: string): RunningExec[] {
  return [
    { id: "r1", command: "npm run build", pid: 1234, startedAt: new Date(Date.now() - 45000).toISOString(), elapsed: 45, timeout: 600, status: "running", userId: "alice" },
    { id: "r2", command: "npm test -- --watch", pid: 1235, startedAt: new Date(Date.now() - 3500000).toISOString(), elapsed: 3500, timeout: 3600, status: "running", userId: "bob" },
    { id: "r3", command: "npm install", pid: 1236, startedAt: new Date(Date.now() - 310000).toISOString(), elapsed: 310, timeout: 300, status: "grace_period", userId: "carol" },
  ];
}

export function getTimeoutEvents(projectId: string): TimeoutEvent[] {
  return [
    { id: "te1", command: "npm run build", action: "graceful_term", timestamp: new Date(Date.now() - 3600000).toISOString(), elapsed: 601, timeout: 600, exitCode: 143 },
    { id: "te2", command: "node scripts/migrate.js", action: "force_kill", timestamp: new Date(Date.now() - 7200000).toISOString(), elapsed: 3660, timeout: 3600, exitCode: 137 },
    { id: "te3", command: "npm test", action: "completed", timestamp: new Date(Date.now() - 1800000).toISOString(), elapsed: 95, timeout: 120, exitCode: 0 },
    { id: "te4", command: "npm install --legacy-peer-deps", action: "alert_sent", timestamp: new Date(Date.now() - 86400000).toISOString(), elapsed: 290, timeout: 300, exitCode: null },
  ];
}

export function killExec(projectId: string, execId: string): { success: boolean } {
  return { success: true };
}

export function updateTimeoutConfig(projectId: string, configId: string, updates: Partial<TimeoutConfig>): TimeoutConfig {
  const configs = getTimeoutConfigs(projectId);
  const config = configs.find(c => c.id === configId);
  if (!config) throw new Error("Config not found");
  return { ...config, ...updates };
}
