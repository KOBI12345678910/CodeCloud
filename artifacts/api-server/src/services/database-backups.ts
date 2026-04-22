export interface DatabaseBackup { id: string; projectId: string; size: number; type: "manual" | "automatic"; status: "in_progress" | "completed" | "failed"; downloadUrl: string | null; createdAt: Date; expiresAt: Date; }
class DatabaseBackupsService {
  private backups: Map<string, DatabaseBackup> = new Map();
  create(projectId: string, type: DatabaseBackup["type"] = "manual"): DatabaseBackup {
    const id = `bak-${Date.now()}`; const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
    const b: DatabaseBackup = { id, projectId, size: Math.floor(Math.random() * 100000000), type, status: "completed", downloadUrl: `/backups/${id}.sql.gz`, createdAt: new Date(), expiresAt };
    this.backups.set(id, b); return b;
  }
  get(id: string): DatabaseBackup | null { return this.backups.get(id) || null; }
  listByProject(projectId: string): DatabaseBackup[] { return Array.from(this.backups.values()).filter(b => b.projectId === projectId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); }
  restore(id: string): { success: boolean; message: string } { const b = this.backups.get(id); if (!b) return { success: false, message: "Not found" }; return { success: true, message: `Restored backup ${id}` }; }
  delete(id: string): boolean { return this.backups.delete(id); }
}
export const databaseBackupsService = new DatabaseBackupsService();
