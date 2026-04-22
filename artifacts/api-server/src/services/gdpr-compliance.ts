export interface DataExportRequest { id: string; userId: string; status: "pending" | "processing" | "completed" | "failed"; downloadUrl: string | null; createdAt: Date; completedAt: Date | null; }
export interface DeletionRequest { id: string; userId: string; reason: string; status: "pending" | "processing" | "completed"; scheduledFor: Date; createdAt: Date; }
class GdprComplianceService {
  private exports: Map<string, DataExportRequest> = new Map();
  private deletions: Map<string, DeletionRequest> = new Map();
  requestExport(userId: string): DataExportRequest {
    const id = `exp-${Date.now()}`; const r: DataExportRequest = { id, userId, status: "processing", downloadUrl: null, createdAt: new Date(), completedAt: null };
    this.exports.set(id, r);
    r.status = "completed"; r.downloadUrl = `/exports/${id}/data.zip`; r.completedAt = new Date();
    return r;
  }
  requestDeletion(userId: string, reason: string): DeletionRequest {
    const scheduled = new Date(); scheduled.setDate(scheduled.getDate() + 30);
    const id = `del-${Date.now()}`; const r: DeletionRequest = { id, userId, reason, status: "pending", scheduledFor: scheduled, createdAt: new Date() };
    this.deletions.set(id, r); return r;
  }
  getExport(id: string): DataExportRequest | null { return this.exports.get(id) || null; }
  getDeletion(id: string): DeletionRequest | null { return this.deletions.get(id) || null; }
  listExports(userId: string): DataExportRequest[] { return Array.from(this.exports.values()).filter(e => e.userId === userId); }
  listDeletions(userId: string): DeletionRequest[] { return Array.from(this.deletions.values()).filter(d => d.userId === userId); }
  cancelDeletion(id: string): boolean { const d = this.deletions.get(id); if (!d || d.status !== "pending") return false; return this.deletions.delete(id); }
}
export const gdprComplianceService = new GdprComplianceService();
