export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq" | "gte" | "lte";
  threshold: number;
  windowMinutes: number;
  severity: "info" | "warning" | "critical";
  channel: "email" | "slack" | "webhook";
  target: string;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered: Date | null;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertRule["severity"];
  status: "firing" | "resolved";
  triggeredAt: Date;
  resolvedAt: Date | null;
}

class MonitoringAlertsService {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];

  createRule(data: Omit<AlertRule, "id" | "lastTriggered">): AlertRule {
    const rule: AlertRule = { ...data, id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, lastTriggered: null };
    this.rules.set(rule.id, rule);
    return rule;
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.rules.get(id); if (!rule) return null;
    Object.assign(rule, updates); return rule;
  }

  deleteRule(id: string): boolean { return this.rules.delete(id); }
  getRules(): AlertRule[] { return Array.from(this.rules.values()); }

  checkMetric(metric: string, value: number): Alert[] {
    const fired: Alert[] = [];
    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.metric !== metric) continue;
      let triggered = false;
      if (rule.condition === "gt") triggered = value > rule.threshold;
      else if (rule.condition === "lt") triggered = value < rule.threshold;
      else if (rule.condition === "gte") triggered = value >= rule.threshold;
      else if (rule.condition === "lte") triggered = value <= rule.threshold;
      else if (rule.condition === "eq") triggered = value === rule.threshold;
      if (triggered) {
        if (rule.lastTriggered && (Date.now() - rule.lastTriggered.getTime()) < rule.cooldownMinutes * 60000) continue;
        const alert: Alert = {
          id: `alert-${Date.now()}`, ruleId: rule.id, ruleName: rule.name, metric, value, threshold: rule.threshold,
          severity: rule.severity, status: "firing", triggeredAt: new Date(), resolvedAt: null,
        };
        this.alerts.push(alert);
        rule.lastTriggered = new Date();
        fired.push(alert);
      }
    }
    return fired;
  }

  getAlerts(status?: "firing" | "resolved"): Alert[] {
    return status ? this.alerts.filter(a => a.status === status) : this.alerts;
  }

  resolveAlert(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id); if (!alert) return false;
    alert.status = "resolved"; alert.resolvedAt = new Date(); return true;
  }
}

export const monitoringAlertsService = new MonitoringAlertsService();
