export interface ProjectStats { projectId: string; totalEdits: number; totalBuilds: number; totalDeploys: number; totalCollaborators: number; linesOfCode: number; languageBreakdown: Record<string, number>; lastActivity: Date; }
class ProjectAnalyticsService {
  private stats: Map<string, ProjectStats> = new Map();
  getStats(projectId: string): ProjectStats { return this.stats.get(projectId) || { projectId, totalEdits: Math.floor(Math.random() * 10000), totalBuilds: Math.floor(Math.random() * 500), totalDeploys: Math.floor(Math.random() * 100), totalCollaborators: Math.floor(Math.random() * 10) + 1, linesOfCode: Math.floor(Math.random() * 50000), languageBreakdown: { TypeScript: 60, JavaScript: 20, CSS: 15, HTML: 5 }, lastActivity: new Date() }; }
  recordEdit(projectId: string): void { const s = this.getOrCreate(projectId); s.totalEdits++; s.lastActivity = new Date(); }
  recordBuild(projectId: string): void { const s = this.getOrCreate(projectId); s.totalBuilds++; }
  recordDeploy(projectId: string): void { const s = this.getOrCreate(projectId); s.totalDeploys++; }
  getTopProjects(limit: number = 10): ProjectStats[] { return Array.from(this.stats.values()).sort((a, b) => b.totalEdits - a.totalEdits).slice(0, limit); }
  private getOrCreate(projectId: string): ProjectStats { if (!this.stats.has(projectId)) this.stats.set(projectId, { projectId, totalEdits: 0, totalBuilds: 0, totalDeploys: 0, totalCollaborators: 1, linesOfCode: 0, languageBreakdown: {}, lastActivity: new Date() }); return this.stats.get(projectId)!; }
}
export const projectAnalyticsService = new ProjectAnalyticsService();
