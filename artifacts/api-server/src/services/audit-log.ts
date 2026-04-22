export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

class AuditLogService {
  private entries: AuditEntry[] = [];

  log(data: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const entry: AuditEntry = { ...data, id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date() };
    this.entries.push(entry);
    if (this.entries.length > 50000) this.entries = this.entries.slice(-25000);
    return entry;
  }

  list(filters?: { userId?: string; action?: string; resource?: string; since?: Date }, limit: number = 100): AuditEntry[] {
    let result = [...this.entries];
    if (filters?.userId) result = result.filter(e => e.userId === filters.userId);
    if (filters?.action) result = result.filter(e => e.action === filters.action);
    if (filters?.resource) result = result.filter(e => e.resource === filters.resource);
    if (filters?.since) result = result.filter(e => e.timestamp >= filters.since!);
    return result.slice(-limit).reverse();
  }

  get(id: string): AuditEntry | null { return this.entries.find(e => e.id === id) || null; }

  getStats(days: number = 30): { totalEvents: number; byAction: Record<string, number>; byResource: Record<string, number>; topUsers: { userId: string; count: number }[] } {
    const since = new Date(Date.now() - days * 86400000);
    const filtered = this.entries.filter(e => e.timestamp >= since);
    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    const byUser = new Map<string, number>();
    for (const e of filtered) {
      byAction[e.action] = (byAction[e.action] || 0) + 1;
      byResource[e.resource] = (byResource[e.resource] || 0) + 1;
      byUser.set(e.userId, (byUser.get(e.userId) || 0) + 1);
    }
    return { totalEvents: filtered.length, byAction, byResource, topUsers: Array.from(byUser).map(([userId, count]) => ({ userId, count })).sort((a, b) => b.count - a.count).slice(0, 10) };
  }

  export(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      const header = "id,userId,action,resource,resourceId,timestamp\n";
      return header + this.entries.map(e => `${e.id},${e.userId},${e.action},${e.resource},${e.resourceId},${e.timestamp.toISOString()}`).join("\n");
    }
    return JSON.stringify(this.entries, null, 2);
  }
}

export const auditLogService = new AuditLogService();
