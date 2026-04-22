export interface FeatureFlag { id: string; name: string; description: string; enabled: boolean; rolloutPercentage: number; targetUsers: string[]; targetPlans: string[]; createdAt: Date; }
class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();
  constructor() {
    const defaults = [
      { name: "ai-autocomplete", description: "AI code autocomplete", enabled: true, rolloutPercentage: 100, targetPlans: ["pro", "team"] },
      { name: "realtime-collab", description: "Real-time collaboration", enabled: true, rolloutPercentage: 100, targetPlans: ["pro", "team"] },
      { name: "gpu-containers", description: "GPU-accelerated containers", enabled: false, rolloutPercentage: 0, targetPlans: ["team"] },
      { name: "dark-mode-v2", description: "New dark mode theme", enabled: true, rolloutPercentage: 50, targetPlans: ["free", "pro", "team"] },
    ];
    for (const d of defaults) { const id = `ff-${d.name}`; this.flags.set(id, { id, ...d, targetUsers: [], createdAt: new Date() }); }
  }
  isEnabled(name: string, userId?: string, plan?: string): boolean {
    const flag = Array.from(this.flags.values()).find(f => f.name === name); if (!flag || !flag.enabled) return false;
    if (userId && flag.targetUsers.length > 0 && !flag.targetUsers.includes(userId)) return false;
    if (plan && flag.targetPlans.length > 0 && !flag.targetPlans.includes(plan)) return false;
    if (flag.rolloutPercentage < 100) return Math.random() * 100 < flag.rolloutPercentage;
    return true;
  }
  list(): FeatureFlag[] { return Array.from(this.flags.values()); }
  create(data: Omit<FeatureFlag, "id" | "createdAt">): FeatureFlag { const id = `ff-${data.name}`; const f: FeatureFlag = { id, ...data, createdAt: new Date() }; this.flags.set(id, f); return f; }
  update(id: string, data: Partial<Pick<FeatureFlag, "enabled" | "rolloutPercentage" | "targetUsers" | "targetPlans">>): FeatureFlag | null { const f = this.flags.get(id); if (!f) return null; Object.assign(f, data); return f; }
  delete(id: string): boolean { return this.flags.delete(id); }
}
export const featureFlagsService = new FeatureFlagsService();
