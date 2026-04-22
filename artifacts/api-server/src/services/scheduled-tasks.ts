export interface ScheduledTask { id: string; projectId: string; name: string; cron: string; command: string; enabled: boolean; lastRun: Date | null; nextRun: Date; status: "idle" | "running" | "failed"; runCount: number; createdAt: Date; }
class ScheduledTasksService {
  private tasks: Map<string, ScheduledTask> = new Map();
  create(data: { projectId: string; name: string; cron: string; command: string }): ScheduledTask {
    const id = `sched-${Date.now()}`; const t: ScheduledTask = { id, ...data, enabled: true, lastRun: null, nextRun: new Date(Date.now() + 3600000), status: "idle", runCount: 0, createdAt: new Date() };
    this.tasks.set(id, t); return t;
  }
  run(id: string): ScheduledTask | null { const t = this.tasks.get(id); if (!t) return null; t.status = "running"; t.lastRun = new Date(); t.runCount++; t.status = "idle"; t.nextRun = new Date(Date.now() + 3600000); return t; }
  toggle(id: string): ScheduledTask | null { const t = this.tasks.get(id); if (!t) return null; t.enabled = !t.enabled; return t; }
  get(id: string): ScheduledTask | null { return this.tasks.get(id) || null; }
  listByProject(projectId: string): ScheduledTask[] { return Array.from(this.tasks.values()).filter(t => t.projectId === projectId); }
  delete(id: string): boolean { return this.tasks.delete(id); }
}
export const scheduledTasksService = new ScheduledTasksService();
