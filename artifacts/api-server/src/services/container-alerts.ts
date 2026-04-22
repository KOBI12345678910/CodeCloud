export interface ContainerAlert {
  id: string;
  containerId: string;
  projectId: string;
  type: "cpu" | "memory" | "disk" | "network";
  severity: "warning" | "critical";
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
  snoozedUntil?: string;
}

export interface AlertThresholds {
  cpu: { warning: number; critical: number; duration: number };
  memory: { warning: number; critical: number; duration: number };
  disk: { warning: number; critical: number };
  network: { errorRateThreshold: number };
}

export function getContainerAlerts(projectId: string): ContainerAlert[] {
  return [
    { id: "a1", containerId: "c1", projectId, type: "cpu", severity: "critical", message: "CPU usage >90% for 5 minutes", currentValue: 94, threshold: 90, triggeredAt: new Date(Date.now() - 300000).toISOString(), acknowledged: false },
    { id: "a2", containerId: "c1", projectId, type: "memory", severity: "warning", message: "Memory usage approaching limit", currentValue: 82, threshold: 85, triggeredAt: new Date(Date.now() - 600000).toISOString(), acknowledged: false },
    { id: "a3", containerId: "c2", projectId, type: "disk", severity: "warning", message: "Disk usage >80%", currentValue: 83, threshold: 90, triggeredAt: new Date(Date.now() - 1800000).toISOString(), acknowledged: true },
    { id: "a4", containerId: "c1", projectId, type: "network", severity: "critical", message: "Network error spike detected", currentValue: 15, threshold: 5, triggeredAt: new Date(Date.now() - 120000).toISOString(), acknowledged: false },
  ];
}

export function getAlertThresholds(projectId: string): AlertThresholds {
  return { cpu: { warning: 80, critical: 90, duration: 300 }, memory: { warning: 75, critical: 85, duration: 300 }, disk: { warning: 80, critical: 90 }, network: { errorRateThreshold: 5 } };
}

export function updateAlertThresholds(projectId: string, thresholds: Partial<AlertThresholds>): AlertThresholds {
  return { ...getAlertThresholds(projectId), ...thresholds };
}

export function acknowledgeAlert(alertId: string): { success: boolean } { return { success: true }; }
export function snoozeAlert(alertId: string, minutes: number): { success: boolean; snoozedUntil: string } {
  return { success: true, snoozedUntil: new Date(Date.now() + minutes * 60000).toISOString() };
}
