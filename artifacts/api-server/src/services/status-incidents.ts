export interface Incident {
  id: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  affectedServices: string[];
  updates: IncidentUpdate[];
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface IncidentUpdate {
  id: string;
  status: Incident["status"];
  message: string;
  createdAt: Date;
}

class StatusIncidentsService {
  private incidents: Map<string, Incident> = new Map();

  create(data: { title: string; description: string; severity: Incident["severity"]; affectedServices: string[] }): Incident {
    const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const incident: Incident = {
      id, ...data, status: "investigating", updates: [
        { id: `upd-1`, status: "investigating", message: data.description, createdAt: new Date() },
      ], createdAt: new Date(), resolvedAt: null,
    };
    this.incidents.set(id, incident);
    return incident;
  }

  addUpdate(id: string, status: Incident["status"], message: string): Incident | null {
    const inc = this.incidents.get(id); if (!inc) return null;
    inc.status = status;
    inc.updates.push({ id: `upd-${inc.updates.length + 1}`, status, message, createdAt: new Date() });
    if (status === "resolved") inc.resolvedAt = new Date();
    return inc;
  }

  get(id: string): Incident | null { return this.incidents.get(id) || null; }
  list(status?: Incident["status"]): Incident[] {
    const all = Array.from(this.incidents.values());
    return status ? all.filter(i => i.status === status) : all;
  }
  delete(id: string): boolean { return this.incidents.delete(id); }

  getStatus(): { status: "operational" | "degraded" | "outage"; activeIncidents: number } {
    const active = Array.from(this.incidents.values()).filter(i => i.status !== "resolved");
    if (active.some(i => i.severity === "critical")) return { status: "outage", activeIncidents: active.length };
    if (active.length > 0) return { status: "degraded", activeIncidents: active.length };
    return { status: "operational", activeIncidents: 0 };
  }
}

export const statusIncidentsService = new StatusIncidentsService();
