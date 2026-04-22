interface Backup {
  id: string;
  projectId: string;
  name: string;
  type: "scheduled" | "manual" | "pre_deploy" | "pre_migration";
  status: "pending" | "running" | "completed" | "failed" | "restoring";
  sizeMb: number;
  snapshotPath: string;
  retentionDays: number;
  isAutomatic: boolean;
  errorMessage: string | null;
  restoredAt: string | null;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class DatabaseBackupsService {
  private backups = new Map<string, Backup>();
  
  constructor() {
    this.seedDemoBackups();
  }

  private seedDemoBackups(): void {
    const now = Date.now();
    const demos: Partial<Backup>[] = [
      { name: "Daily automated backup", type: "scheduled", status: "completed", sizeMb: 245, isAutomatic: true, completedAt: new Date(now - 2 * 3600_000).toISOString() },
      { name: "Pre-deploy snapshot", type: "pre_deploy", status: "completed", sizeMb: 243, isAutomatic: false, completedAt: new Date(now - 8 * 3600_000).toISOString() },
      { name: "Daily automated backup", type: "scheduled", status: "completed", sizeMb: 238, isAutomatic: true, completedAt: new Date(now - 26 * 3600_000).toISOString() },
      { name: "Manual safety backup", type: "manual", status: "completed", sizeMb: 241, isAutomatic: false, completedAt: new Date(now - 48 * 3600_000).toISOString() },
      { name: "Daily automated backup", type: "scheduled", status: "completed", sizeMb: 230, isAutomatic: true, completedAt: new Date(now - 50 * 3600_000).toISOString() },
      { name: "Pre-migration backup", type: "pre_migration", status: "completed", sizeMb: 228, isAutomatic: false, completedAt: new Date(now - 72 * 3600_000).toISOString() },
    ];

    for (const demo of demos) {
      const id = `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = demo.completedAt ? new Date(new Date(demo.completedAt).getTime() - 30_000).toISOString() : new Date().toISOString();
      this.backups.set(id, {
        id,
        projectId: "demo-project",
        name: demo.name!,
        type: demo.type!,
        status: demo.status!,
        sizeMb: demo.sizeMb!,
        snapshotPath: `/backups/demo-project/${id}.sql.gz`,
        retentionDays: 30,
        isAutomatic: demo.isAutomatic!,
        errorMessage: null,
        restoredAt: null,
        expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
        completedAt: demo.completedAt || null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  listByProject(projectId: string): { backups: Backup[]; total: number; totalSizeMb: number; oldestBackup: string | null; nextScheduled: string } {
    const list = [...this.backups.values()]
      .filter(b => b.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalSizeMb = list.reduce((sum, b) => sum + (b.sizeMb || 0), 0);
    const oldestBackup = list.length > 0 ? list[list.length - 1].createdAt : null;
    const nextHour = new Date();
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);

    return { backups: list, total: list.length, totalSizeMb, oldestBackup, nextScheduled: nextHour.toISOString() };
  }

  get(id: string): Backup | null {
    return this.backups.get(id) || null;
  }

  create(projectId: string, type: Backup["type"] = "manual", name?: string): Backup {
    const id = `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const backup: Backup = {
      id, projectId,
      name: name || `${type === "manual" ? "Manual" : type === "scheduled" ? "Scheduled" : type === "pre_deploy" ? "Pre-deploy" : "Pre-migration"} backup`,
      type, status: "running", sizeMb: 0,
      snapshotPath: `/backups/${projectId}/${id}.sql.gz`,
      retentionDays: 30, isAutomatic: type === "scheduled",
      errorMessage: null, restoredAt: null,
      expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      completedAt: null, createdAt: now, updatedAt: now,
    };
    this.backups.set(id, backup);

    setTimeout(() => {
      backup.status = "completed";
      backup.sizeMb = Math.floor(200 + Math.random() * 100);
      backup.completedAt = new Date().toISOString();
      backup.updatedAt = new Date().toISOString();
    }, 2000);

    return backup;
  }

  restore(id: string): { success: boolean; message: string; backup: Backup | null } {
    const backup = this.backups.get(id);
    if (!backup) return { success: false, message: "Backup not found", backup: null };
    if (backup.status !== "completed") return { success: false, message: "Only completed backups can be restored", backup };

    backup.status = "restoring";
    backup.updatedAt = new Date().toISOString();

    setTimeout(() => {
      backup.status = "completed";
      backup.restoredAt = new Date().toISOString();
      backup.updatedAt = new Date().toISOString();
    }, 3000);

    return { success: true, message: "Restore initiated", backup };
  }

  delete(id: string): boolean {
    return this.backups.delete(id);
  }

  getRetentionPolicy(_projectId: string): { retentionDays: number; maxBackups: number; autoBackupEnabled: boolean; autoBackupInterval: string; nextBackup: string } {
    const nextHour = new Date();
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    return { retentionDays: 30, maxBackups: 100, autoBackupEnabled: true, autoBackupInterval: "daily", nextBackup: nextHour.toISOString() };
  }

  getStorageUsage(projectId: string): { usedMb: number; limitMb: number; backupCount: number } {
    const list = [...this.backups.values()].filter(b => b.projectId === projectId);
    return { usedMb: list.reduce((sum, b) => sum + (b.sizeMb || 0), 0), limitMb: 10240, backupCount: list.length };
  }

  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, backup] of this.backups) {
      if (new Date(backup.expiresAt).getTime() < now) {
        this.backups.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}

export const databaseBackupsService = new DatabaseBackupsService();
