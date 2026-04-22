export interface CrashReport { id: string; projectId: string; error: string; stackTrace: string; environment: string; browser: string; userId: string | null; url: string; count: number; firstSeen: Date; lastSeen: Date; status: "open" | "investigating" | "fixed" | "ignored"; }
class CrashReportsService {
  private reports: Map<string, CrashReport> = new Map();
  report(data: { projectId: string; error: string; stackTrace: string; environment?: string; browser?: string; userId?: string; url: string }): CrashReport {
    const existing = Array.from(this.reports.values()).find(r => r.projectId === data.projectId && r.error === data.error);
    if (existing) { existing.count++; existing.lastSeen = new Date(); return existing; }
    const id = `crash-${Date.now()}`; const r: CrashReport = { id, ...data, environment: data.environment || "production", browser: data.browser || "unknown", userId: data.userId || null, count: 1, firstSeen: new Date(), lastSeen: new Date(), status: "open" };
    this.reports.set(id, r); return r;
  }
  get(id: string): CrashReport | null { return this.reports.get(id) || null; }
  listByProject(projectId: string): CrashReport[] { return Array.from(this.reports.values()).filter(r => r.projectId === projectId).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()); }
  updateStatus(id: string, status: CrashReport["status"]): CrashReport | null { const r = this.reports.get(id); if (!r) return null; r.status = status; return r; }
  getStats(projectId: string): { total: number; open: number; fixed: number; topErrors: { error: string; count: number }[] } {
    const reports = this.listByProject(projectId);
    return { total: reports.length, open: reports.filter(r => r.status === "open").length, fixed: reports.filter(r => r.status === "fixed").length, topErrors: reports.sort((a, b) => b.count - a.count).slice(0, 5).map(r => ({ error: r.error, count: r.count })) };
  }
}
export const crashReportsService = new CrashReportsService();
