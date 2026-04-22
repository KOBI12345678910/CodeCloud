export interface ArchivedProject { id: string; projectId: string; projectName: string; archivedBy: string; reason: string; archiveUrl: string; status: "archiving" | "archived" | "restored"; archivedAt: Date; restoredAt: Date | null; }
class ProjectArchivalService {
  private archives: Map<string, ArchivedProject> = new Map();
  archive(data: { projectId: string; projectName: string; archivedBy: string; reason: string }): ArchivedProject {
    const id = `arch-${Date.now()}`; const a: ArchivedProject = { id, ...data, archiveUrl: `/archives/${id}.tar.gz`, status: "archived", archivedAt: new Date(), restoredAt: null };
    this.archives.set(id, a); return a;
  }
  restore(id: string): ArchivedProject | null { const a = this.archives.get(id); if (!a) return null; a.status = "restored"; a.restoredAt = new Date(); return a; }
  get(id: string): ArchivedProject | null { return this.archives.get(id) || null; }
  list(): ArchivedProject[] { return Array.from(this.archives.values()); }
  listByUser(userId: string): ArchivedProject[] { return Array.from(this.archives.values()).filter(a => a.archivedBy === userId); }
}
export const projectArchivalService = new ProjectArchivalService();
