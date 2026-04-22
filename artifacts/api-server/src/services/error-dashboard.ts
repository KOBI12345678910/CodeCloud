export interface ErrorEvent {
  id: string;
  projectId: string;
  message: string;
  stack: string;
  type: string;
  url: string;
  userAgent: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  status: "unresolved" | "resolved" | "ignored";
}

class ErrorDashboardService {
  private errors: Map<string, ErrorEvent> = new Map();

  record(projectId: string, data: { message: string; stack: string; type: string; url: string; userAgent: string }): ErrorEvent {
    const fingerprint = `${data.message}:${data.type}`;
    const existing = Array.from(this.errors.values()).find(e => e.projectId === projectId && e.message === data.message && e.type === data.type);
    if (existing) { existing.count++; existing.lastSeen = new Date(); return existing; }
    const event: ErrorEvent = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId, ...data, count: 1, firstSeen: new Date(), lastSeen: new Date(), status: "unresolved",
    };
    this.errors.set(event.id, event);
    return event;
  }

  list(projectId: string, status?: ErrorEvent["status"]): ErrorEvent[] {
    let errs = Array.from(this.errors.values()).filter(e => e.projectId === projectId);
    if (status) errs = errs.filter(e => e.status === status);
    return errs.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  get(id: string): ErrorEvent | null { return this.errors.get(id) || null; }
  updateStatus(id: string, status: ErrorEvent["status"]): ErrorEvent | null { const e = this.errors.get(id); if (!e) return null; e.status = status; return e; }

  getStats(projectId: string): { total: number; unresolved: number; resolved: number; ignored: number; topErrors: { message: string; count: number }[] } {
    const errs = Array.from(this.errors.values()).filter(e => e.projectId === projectId);
    return {
      total: errs.length, unresolved: errs.filter(e => e.status === "unresolved").length,
      resolved: errs.filter(e => e.status === "resolved").length, ignored: errs.filter(e => e.status === "ignored").length,
      topErrors: errs.sort((a, b) => b.count - a.count).slice(0, 10).map(e => ({ message: e.message, count: e.count })),
    };
  }
}

export const errorDashboardService = new ErrorDashboardService();
