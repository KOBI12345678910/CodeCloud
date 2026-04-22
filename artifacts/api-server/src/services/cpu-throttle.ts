export interface CPUAllocation {
  containerId: string;
  containerName: string;
  allocatedCores: number;
  maxCores: number;
  priority: "low" | "normal" | "high" | "critical";
  credits: number;
  throttled: boolean;
  currentUsage: number;
  lastUpdated: Date;
}

export interface ThrottleEvent {
  containerId: string;
  timestamp: Date;
  action: "throttled" | "unthrottled" | "credit_added" | "credit_used" | "priority_changed";
  details: string;
}

class CPUThrottleService {
  private allocations: Map<string, CPUAllocation> = new Map();
  private events: ThrottleEvent[] = [];
  private readonly BASE_CREDITS = 100;

  allocate(containerId: string, containerName: string, maxCores: number, priority: CPUAllocation["priority"]): CPUAllocation {
    const alloc: CPUAllocation = {
      containerId, containerName,
      allocatedCores: this.coresForPriority(priority, maxCores),
      maxCores, priority,
      credits: this.BASE_CREDITS,
      throttled: false, currentUsage: 0,
      lastUpdated: new Date(),
    };
    this.allocations.set(containerId, alloc);
    return alloc;
  }

  getAllocations(): CPUAllocation[] {
    return Array.from(this.allocations.values());
  }

  updateUsage(containerId: string, cpuPercent: number): CPUAllocation | null {
    const alloc = this.allocations.get(containerId);
    if (!alloc) return null;
    alloc.currentUsage = cpuPercent;
    alloc.lastUpdated = new Date();

    if (cpuPercent > 90 && alloc.credits > 0) {
      alloc.credits -= 5;
      this.logEvent(containerId, "credit_used", `Used 5 credits (${alloc.credits} remaining), CPU at ${cpuPercent}%`);
    }

    if (cpuPercent < 20 && !alloc.throttled) {
      alloc.allocatedCores = Math.max(0.25, alloc.allocatedCores * 0.5);
      alloc.throttled = true;
      this.logEvent(containerId, "throttled", `Idle container throttled to ${alloc.allocatedCores} cores`);
    } else if (cpuPercent > 60 && alloc.throttled) {
      alloc.allocatedCores = this.coresForPriority(alloc.priority, alloc.maxCores);
      alloc.throttled = false;
      this.logEvent(containerId, "unthrottled", `Container unthrottled to ${alloc.allocatedCores} cores`);
    }

    return alloc;
  }

  setPriority(containerId: string, priority: CPUAllocation["priority"]): CPUAllocation | null {
    const alloc = this.allocations.get(containerId);
    if (!alloc) return null;
    alloc.priority = priority;
    alloc.allocatedCores = this.coresForPriority(priority, alloc.maxCores);
    this.logEvent(containerId, "priority_changed", `Priority set to ${priority}`);
    return alloc;
  }

  addCredits(containerId: string, amount: number): CPUAllocation | null {
    const alloc = this.allocations.get(containerId);
    if (!alloc) return null;
    alloc.credits += amount;
    this.logEvent(containerId, "credit_added", `Added ${amount} credits (${alloc.credits} total)`);
    return alloc;
  }

  getEvents(containerId?: string, limit = 50): ThrottleEvent[] {
    let filtered = [...this.events];
    if (containerId) filtered = filtered.filter(e => e.containerId === containerId);
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  private coresForPriority(priority: CPUAllocation["priority"], max: number): number {
    const multipliers = { low: 0.25, normal: 0.5, high: 0.75, critical: 1.0 };
    return max * multipliers[priority];
  }

  private logEvent(containerId: string, action: ThrottleEvent["action"], details: string): void {
    this.events.push({ containerId, timestamp: new Date(), action, details });
  }
}

export const cpuThrottleService = new CPUThrottleService();
