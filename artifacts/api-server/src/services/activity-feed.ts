export interface Activity { id: string; userId: string; userName: string; type: "edit" | "create" | "delete" | "deploy" | "comment" | "star" | "fork" | "join" | "leave"; projectId: string; projectName: string; details: string; createdAt: Date; }
class ActivityFeedService {
  private activities: Activity[] = [];
  add(data: Omit<Activity, "id" | "createdAt">): Activity { const a: Activity = { ...data, id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date() }; this.activities.unshift(a); if (this.activities.length > 5000) this.activities = this.activities.slice(0, 3000); return a; }
  getByUser(userId: string, limit: number = 50): Activity[] { return this.activities.filter(a => a.userId === userId).slice(0, limit); }
  getByProject(projectId: string, limit: number = 50): Activity[] { return this.activities.filter(a => a.projectId === projectId).slice(0, limit); }
  getGlobal(limit: number = 50): Activity[] { return this.activities.slice(0, limit); }
  getByType(type: Activity["type"], limit: number = 50): Activity[] { return this.activities.filter(a => a.type === type).slice(0, limit); }
}
export const activityFeedService = new ActivityFeedService();
