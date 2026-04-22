export interface HealingPolicy {
  id: string;
  deploymentId: string;
  enabled: boolean;
  maxRetries: number;
  backoffBase: number;
  backoffMax: number;
  healthCheckInterval: number;
  healthCheckPath: string;
  circuitBreakerThreshold: number;
  circuitBreakerCooldown: number;
}

export interface HealingEvent {
  id: string;
  deploymentId: string;
  type: "crash_detected" | "restart_attempted" | "restart_succeeded" | "restart_failed" | "circuit_breaker_open" | "circuit_breaker_closed" | "health_check_passed" | "health_check_failed";
  timestamp: string;
  attempt: number;
  backoffDelay: number;
  details: string;
}

export interface HealingStatus {
  deploymentId: string;
  state: "healthy" | "recovering" | "circuit_breaker_open" | "failed";
  currentAttempt: number;
  lastCrash: string | null;
  lastRecovery: string | null;
  totalCrashes: number;
  totalRecoveries: number;
  uptime: number;
  policy: HealingPolicy;
  recentEvents: HealingEvent[];
}

export function getHealingStatus(projectId: string): HealingStatus[] {
  return [
    {
      deploymentId: "dep-prod-1", state: "healthy", currentAttempt: 0,
      lastCrash: new Date(Date.now() - 3 * 86400000).toISOString(),
      lastRecovery: new Date(Date.now() - 3 * 86400000 + 15000).toISOString(),
      totalCrashes: 5, totalRecoveries: 5, uptime: 99.98,
      policy: { id: "pol-1", deploymentId: "dep-prod-1", enabled: true, maxRetries: 5, backoffBase: 1000, backoffMax: 60000, healthCheckInterval: 30000, healthCheckPath: "/health", circuitBreakerThreshold: 5, circuitBreakerCooldown: 300000 },
      recentEvents: [
        { id: "e1", deploymentId: "dep-prod-1", type: "health_check_passed", timestamp: new Date(Date.now() - 30000).toISOString(), attempt: 0, backoffDelay: 0, details: "GET /health returned 200 in 45ms" },
        { id: "e2", deploymentId: "dep-prod-1", type: "restart_succeeded", timestamp: new Date(Date.now() - 3 * 86400000 + 15000).toISOString(), attempt: 1, backoffDelay: 1000, details: "Process restarted successfully after OOM kill" },
        { id: "e3", deploymentId: "dep-prod-1", type: "crash_detected", timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), attempt: 0, backoffDelay: 0, details: "Process exited with signal SIGKILL (OOM)" },
      ],
    },
    {
      deploymentId: "dep-staging-1", state: "recovering", currentAttempt: 2,
      lastCrash: new Date(Date.now() - 120000).toISOString(),
      lastRecovery: null,
      totalCrashes: 12, totalRecoveries: 9, uptime: 98.5,
      policy: { id: "pol-2", deploymentId: "dep-staging-1", enabled: true, maxRetries: 3, backoffBase: 2000, backoffMax: 30000, healthCheckInterval: 15000, healthCheckPath: "/health", circuitBreakerThreshold: 3, circuitBreakerCooldown: 180000 },
      recentEvents: [
        { id: "e4", deploymentId: "dep-staging-1", type: "restart_attempted", timestamp: new Date(Date.now() - 60000).toISOString(), attempt: 2, backoffDelay: 8000, details: "Attempting restart (attempt 2/3, backoff 8s)" },
        { id: "e5", deploymentId: "dep-staging-1", type: "restart_failed", timestamp: new Date(Date.now() - 90000).toISOString(), attempt: 1, backoffDelay: 2000, details: "Health check failed after restart" },
        { id: "e6", deploymentId: "dep-staging-1", type: "crash_detected", timestamp: new Date(Date.now() - 120000).toISOString(), attempt: 0, backoffDelay: 0, details: "Process exited with code 1 (unhandled exception)" },
      ],
    },
    {
      deploymentId: "dep-preview-3", state: "circuit_breaker_open", currentAttempt: 5,
      lastCrash: new Date(Date.now() - 600000).toISOString(),
      lastRecovery: null,
      totalCrashes: 18, totalRecoveries: 13, uptime: 95.2,
      policy: { id: "pol-3", deploymentId: "dep-preview-3", enabled: true, maxRetries: 5, backoffBase: 1000, backoffMax: 60000, healthCheckInterval: 30000, healthCheckPath: "/api/health", circuitBreakerThreshold: 5, circuitBreakerCooldown: 300000 },
      recentEvents: [
        { id: "e7", deploymentId: "dep-preview-3", type: "circuit_breaker_open", timestamp: new Date(Date.now() - 600000).toISOString(), attempt: 5, backoffDelay: 0, details: "Circuit breaker opened after 5 consecutive failures. Cooldown: 5 minutes." },
        { id: "e8", deploymentId: "dep-preview-3", type: "restart_failed", timestamp: new Date(Date.now() - 660000).toISOString(), attempt: 5, backoffDelay: 60000, details: "Max retries exhausted" },
      ],
    },
  ];
}

export function triggerManualRestart(projectId: string, deploymentId: string): HealingEvent {
  return { id: crypto.randomUUID(), deploymentId, type: "restart_attempted", timestamp: new Date().toISOString(), attempt: 0, backoffDelay: 0, details: "Manual restart triggered by user" };
}

export function resetCircuitBreaker(projectId: string, deploymentId: string): { success: boolean } {
  return { success: true };
}
