export interface AlertRule {
  id: string;
  name: string;
  type: "new_error_type" | "rate_spike" | "threshold";
  condition: { errorRate?: number; windowSeconds?: number; threshold?: number };
  channels: ("slack" | "pagerduty" | "email" | "webhook")[];
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered: Date | null;
}

export interface ErrorAlert {
  id: string;
  ruleId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  errorType: string;
  errorCount: number;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt: Date | null;
  notifiedChannels: string[];
}

export interface OnCallRotation {
  id: string;
  name: string;
  members: { userId: string; name: string; phone: string; email: string }[];
  currentIndex: number;
  rotationHours: number;
  lastRotated: Date;
}

class ErrorAlertingService {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: ErrorAlert[] = [];
  private rotations: Map<string, OnCallRotation> = new Map();
  private errorCounts: Map<string, { count: number; windowStart: number }> = new Map();

  createRule(rule: Omit<AlertRule, "id" | "lastTriggered">): AlertRule {
    const id = `ar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: AlertRule = { ...rule, id, lastTriggered: null };
    this.rules.set(id, entry);
    return entry;
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;
    Object.assign(rule, updates);
    return rule;
  }

  checkError(errorType: string, message: string): ErrorAlert[] {
    const triggered: ErrorAlert[] = [];
    const now = Date.now();

    const key = errorType;
    let counter = this.errorCounts.get(key);
    if (!counter || now - counter.windowStart > 60000) {
      counter = { count: 0, windowStart: now };
      this.errorCounts.set(key, counter);
    }
    counter.count++;

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.lastTriggered && now - rule.lastTriggered.getTime() < rule.cooldownMinutes * 60000) continue;

      let shouldTrigger = false;
      if (rule.type === "rate_spike" && rule.condition.errorRate && counter.count >= rule.condition.errorRate) {
        shouldTrigger = true;
      }
      if (rule.type === "threshold" && rule.condition.threshold && counter.count >= rule.condition.threshold) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        const alert: ErrorAlert = {
          id: `ea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ruleId: rule.id,
          severity: counter.count > 100 ? "critical" : counter.count > 20 ? "warning" : "info",
          message: `${rule.name}: ${message}`,
          errorType, errorCount: counter.count,
          timestamp: new Date(), acknowledged: false,
          resolvedAt: null, notifiedChannels: rule.channels,
        };
        this.alerts.push(alert);
        rule.lastTriggered = new Date();
        triggered.push(alert);
      }
    }
    return triggered;
  }

  getAlerts(acknowledged?: boolean, limit = 50): ErrorAlert[] {
    let results = [...this.alerts];
    if (acknowledged !== undefined) results = results.filter(a => a.acknowledged === acknowledged);
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;
    alert.resolvedAt = new Date();
    alert.acknowledged = true;
    return true;
  }

  createRotation(rotation: Omit<OnCallRotation, "id" | "currentIndex" | "lastRotated">): OnCallRotation {
    const id = `rot-${Date.now()}`;
    const entry: OnCallRotation = { ...rotation, id, currentIndex: 0, lastRotated: new Date() };
    this.rotations.set(id, entry);
    return entry;
  }

  getRotations(): OnCallRotation[] {
    return Array.from(this.rotations.values());
  }

  getCurrentOnCall(rotationId: string): { userId: string; name: string } | null {
    const rotation = this.rotations.get(rotationId);
    if (!rotation || rotation.members.length === 0) return null;
    return rotation.members[rotation.currentIndex % rotation.members.length];
  }
}

export const errorAlertingService = new ErrorAlertingService();
