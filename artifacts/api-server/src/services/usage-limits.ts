export interface PlanLimits { plan: string; maxProjects: number; maxCollaborators: number; maxStorage: number; maxBuildMinutes: number; maxContainers: number; features: string[]; }
export interface UserUsage { userId: string; projects: number; storage: number; buildMinutes: number; containers: number; }
class UsageLimitsService {
  private planLimits: Map<string, PlanLimits> = new Map([
    ["free", { plan: "free", maxProjects: 5, maxCollaborators: 1, maxStorage: 500, maxBuildMinutes: 100, maxContainers: 1, features: ["basic-editor", "terminal", "deploy"] }],
    ["pro", { plan: "pro", maxProjects: 50, maxCollaborators: 10, maxStorage: 10000, maxBuildMinutes: 3000, maxContainers: 5, features: ["basic-editor", "terminal", "deploy", "ai-assist", "custom-domains", "private-repos", "collab"] }],
    ["team", { plan: "team", maxProjects: 200, maxCollaborators: 50, maxStorage: 50000, maxBuildMinutes: 10000, maxContainers: 20, features: ["basic-editor", "terminal", "deploy", "ai-assist", "custom-domains", "private-repos", "collab", "sso", "audit-log", "priority-support"] }],
  ]);
  private usage: Map<string, UserUsage> = new Map();
  getLimits(plan: string): PlanLimits | null { return this.planLimits.get(plan) || null; }
  getAllLimits(): PlanLimits[] { return Array.from(this.planLimits.values()); }
  getUsage(userId: string): UserUsage { return this.usage.get(userId) || { userId, projects: 0, storage: 0, buildMinutes: 0, containers: 0 }; }
  checkLimit(userId: string, plan: string, resource: keyof Omit<UserUsage, "userId">): { allowed: boolean; current: number; limit: number } {
    const limits = this.planLimits.get(plan); const u = this.getUsage(userId);
    const limitMap: Record<string, number> = { projects: limits?.maxProjects || 0, storage: limits?.maxStorage || 0, buildMinutes: limits?.maxBuildMinutes || 0, containers: limits?.maxContainers || 0 };
    return { allowed: u[resource] < (limitMap[resource] || 0), current: u[resource], limit: limitMap[resource] || 0 };
  }
  recordUsage(userId: string, resource: keyof Omit<UserUsage, "userId">, amount: number = 1): UserUsage {
    const u = this.getUsage(userId); u[resource] += amount; this.usage.set(userId, u); return u;
  }
}
export const usageLimitsService = new UsageLimitsService();
