export interface BlueGreenDeployment {
  id: string;
  projectId: string;
  activeSlot: "blue" | "green";
  blueVersion: string;
  greenVersion: string;
  blueHealth: "healthy" | "unhealthy" | "unknown";
  greenHealth: "healthy" | "unhealthy" | "unknown";
  blueTrafficPercent: number;
  greenTrafficPercent: number;
  lastSwitch: Date | null;
  createdAt: Date;
}

export interface SwitchEvent {
  id: string;
  deploymentId: string;
  from: "blue" | "green";
  to: "blue" | "green";
  reason: string;
  timestamp: Date;
  duration: number;
  rollback: boolean;
}

class BlueGreenService {
  private deployments: Map<string, BlueGreenDeployment> = new Map();
  private events: SwitchEvent[] = [];

  create(projectId: string, blueVersion: string, greenVersion: string): BlueGreenDeployment {
    const id = `bg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const deployment: BlueGreenDeployment = {
      id, projectId, activeSlot: "blue",
      blueVersion, greenVersion,
      blueHealth: "healthy", greenHealth: "healthy",
      blueTrafficPercent: 100, greenTrafficPercent: 0,
      lastSwitch: null, createdAt: new Date(),
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  get(id: string): BlueGreenDeployment | null {
    return this.deployments.get(id) || null;
  }

  getAll(): BlueGreenDeployment[] {
    return Array.from(this.deployments.values());
  }

  switchTraffic(id: string, reason: string): SwitchEvent | null {
    const dep = this.deployments.get(id);
    if (!dep) return null;

    const from = dep.activeSlot;
    const to = from === "blue" ? "green" : "blue";

    dep.activeSlot = to as "blue" | "green";
    dep.blueTrafficPercent = to === "blue" ? 100 : 0;
    dep.greenTrafficPercent = to === "green" ? 100 : 0;
    dep.lastSwitch = new Date();

    const event: SwitchEvent = {
      id: `se-${Date.now()}`, deploymentId: id,
      from: from as "blue" | "green", to: to as "blue" | "green",
      reason, timestamp: new Date(), duration: Math.floor(Math.random() * 500) + 50,
      rollback: false,
    };
    this.events.push(event);
    return event;
  }

  setTrafficSplit(id: string, bluePct: number): BlueGreenDeployment | null {
    const dep = this.deployments.get(id);
    if (!dep) return null;
    dep.blueTrafficPercent = Math.min(100, Math.max(0, bluePct));
    dep.greenTrafficPercent = 100 - dep.blueTrafficPercent;
    return dep;
  }

  updateHealth(id: string, slot: "blue" | "green", health: "healthy" | "unhealthy"): BlueGreenDeployment | null {
    const dep = this.deployments.get(id);
    if (!dep) return null;
    if (slot === "blue") dep.blueHealth = health;
    else dep.greenHealth = health;
    return dep;
  }

  rollback(id: string): SwitchEvent | null {
    const lastEvent = this.events.filter(e => e.deploymentId === id).pop();
    if (!lastEvent) return null;
    const event = this.switchTraffic(id, "Rollback");
    if (event) event.rollback = true;
    return event;
  }

  getEvents(deploymentId?: string): SwitchEvent[] {
    let filtered = [...this.events];
    if (deploymentId) filtered = filtered.filter(e => e.deploymentId === deploymentId);
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

export const blueGreenService = new BlueGreenService();
