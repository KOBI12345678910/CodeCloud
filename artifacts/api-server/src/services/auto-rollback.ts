export interface RollbackTrigger {
  id: string;
  deploymentId: string;
  type: "error_rate" | "response_time" | "health_check" | "memory_leak";
  threshold: number;
  unit: string;
  duration: number;
  enabled: boolean;
  lastTriggered: Date | null;
  rollbackCount: number;
}

export interface RollbackEvent {
  id: string;
  deploymentId: string;
  triggerId: string;
  triggerType: string;
  value: number;
  threshold: number;
  rolledBackTo: string;
  timestamp: Date;
  automatic: boolean;
}

class AutoRollbackService {
  private triggers: Map<string, RollbackTrigger> = new Map();
  private events: RollbackEvent[] = [];

  createTrigger(deploymentId: string, type: RollbackTrigger["type"], threshold: number): RollbackTrigger {
    const id = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const units: Record<string, string> = { error_rate: "%", response_time: "ms", health_check: "min", memory_leak: "MB/hr" };
    const durations: Record<string, number> = { error_rate: 60, response_time: 60, health_check: 120, memory_leak: 300 };
    const trigger: RollbackTrigger = {
      id, deploymentId, type, threshold, unit: units[type],
      duration: durations[type], enabled: true, lastTriggered: null, rollbackCount: 0,
    };
    this.triggers.set(id, trigger);
    return trigger;
  }

  checkAndRollback(deploymentId: string, metrics: { errorRate: number; responseTime: number; healthCheckFails: number; memoryGrowth: number }): RollbackEvent | null {
    const triggers = Array.from(this.triggers.values()).filter(t => t.deploymentId === deploymentId && t.enabled);
    for (const trigger of triggers) {
      let value = 0;
      if (trigger.type === "error_rate") value = metrics.errorRate;
      else if (trigger.type === "response_time") value = metrics.responseTime;
      else if (trigger.type === "health_check") value = metrics.healthCheckFails;
      else if (trigger.type === "memory_leak") value = metrics.memoryGrowth;

      if (value > trigger.threshold) {
        trigger.lastTriggered = new Date();
        trigger.rollbackCount++;
        const event: RollbackEvent = {
          id: `re-${Date.now()}`, deploymentId, triggerId: trigger.id,
          triggerType: trigger.type, value, threshold: trigger.threshold,
          rolledBackTo: `v${Math.floor(Math.random() * 10) + 1}`,
          timestamp: new Date(), automatic: true,
        };
        this.events.push(event);
        return event;
      }
    }
    return null;
  }

  getTriggers(deploymentId?: string): RollbackTrigger[] {
    const all = Array.from(this.triggers.values());
    return deploymentId ? all.filter(t => t.deploymentId === deploymentId) : all;
  }

  getEvents(deploymentId?: string): RollbackEvent[] {
    return deploymentId ? this.events.filter(e => e.deploymentId === deploymentId) : this.events;
  }

  updateTrigger(id: string, updates: Partial<Pick<RollbackTrigger, "threshold" | "duration" | "enabled">>): RollbackTrigger | null {
    const t = this.triggers.get(id);
    if (!t) return null;
    Object.assign(t, updates);
    return t;
  }

  deleteTrigger(id: string): boolean { return this.triggers.delete(id); }
}

export const autoRollbackService = new AutoRollbackService();
