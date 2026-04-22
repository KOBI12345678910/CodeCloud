export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: "critical" | "warning" | "info";
  enabled: boolean;
  channels: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  status: "firing" | "resolved";
  firedAt: string;
  resolvedAt?: string;
}

export function getDefaultAlertRules(): AlertRule[] {
  return [
    { id: "err-rate", name: "High Error Rate", condition: "error_rate > threshold", threshold: 5, severity: "critical", enabled: true, channels: ["email", "in-app"] },
    { id: "resp-time", name: "Slow Response", condition: "p95_response_time > threshold", threshold: 2000, severity: "warning", enabled: true, channels: ["in-app"] },
    { id: "downtime", name: "Downtime Detected", condition: "uptime_check == false", threshold: 0, severity: "critical", enabled: true, channels: ["email", "in-app"] },
    { id: "ssl-expiry", name: "SSL Expiry Soon", condition: "ssl_days_remaining < threshold", threshold: 14, severity: "warning", enabled: true, channels: ["email"] },
    { id: "disk-full", name: "Disk Full", condition: "disk_usage > threshold", threshold: 90, severity: "critical", enabled: true, channels: ["email", "in-app"] },
    { id: "mem-leak", name: "Memory Leak", condition: "memory_growth_rate > threshold", threshold: 50, severity: "warning", enabled: true, channels: ["in-app"] },
  ];
}

export function getActiveAlerts(projectId: string): Alert[] {
  const now = new Date().toISOString();
  const alerts: Alert[] = [];
  if (Math.random() > 0.5) {
    alerts.push({ id: crypto.randomUUID(), ruleId: "resp-time", ruleName: "Slow Response", severity: "warning", message: "P95 response time is 2.3s (threshold: 2s)", value: 2300, threshold: 2000, status: "firing", firedAt: new Date(Date.now() - 3600000).toISOString() });
  }
  if (Math.random() > 0.7) {
    alerts.push({ id: crypto.randomUUID(), ruleId: "err-rate", ruleName: "High Error Rate", severity: "critical", message: "Error rate at 7.2% (threshold: 5%)", value: 7.2, threshold: 5, status: "firing", firedAt: new Date(Date.now() - 1800000).toISOString() });
  }
  alerts.push({ id: crypto.randomUUID(), ruleId: "ssl-expiry", ruleName: "SSL Expiry Soon", severity: "warning", message: "SSL certificate expires in 12 days", value: 12, threshold: 14, status: "firing", firedAt: new Date(Date.now() - 86400000).toISOString() });
  return alerts;
}
