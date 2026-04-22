export interface DeploymentStrategy { id: string; projectId: string; type: "rolling" | "blue-green" | "canary" | "recreate"; config: Record<string, any>; active: boolean; createdAt: Date; }
export interface AutoScaleConfig { id: string; projectId: string; minInstances: number; maxInstances: number; targetCPU: number; targetMemory: number; scaleToZero: boolean; cooldown: number; currentInstances: number; }
class DeploymentStrategiesService {
  private strategies: Map<string, DeploymentStrategy> = new Map();
  private scales: Map<string, AutoScaleConfig> = new Map();
  setStrategy(data: { projectId: string; type: DeploymentStrategy["type"]; config?: Record<string, any> }): DeploymentStrategy {
    const id = `strat-${Date.now()}`; const s: DeploymentStrategy = { id, projectId: data.projectId, type: data.type, config: data.config || {}, active: true, createdAt: new Date() };
    this.strategies.set(id, s); return s;
  }
  getStrategy(projectId: string): DeploymentStrategy | null { return Array.from(this.strategies.values()).find(s => s.projectId === projectId && s.active) || null; }
  configureAutoScale(data: { projectId: string; minInstances?: number; maxInstances?: number; targetCPU?: number; scaleToZero?: boolean }): AutoScaleConfig {
    const c: AutoScaleConfig = { id: `scale-${Date.now()}`, projectId: data.projectId, minInstances: data.minInstances || 1, maxInstances: data.maxInstances || 10, targetCPU: data.targetCPU || 70, targetMemory: 80, scaleToZero: data.scaleToZero || false, cooldown: 300, currentInstances: 1 };
    this.scales.set(c.id, c); return c;
  }
  getAutoScale(projectId: string): AutoScaleConfig | null { return Array.from(this.scales.values()).find(s => s.projectId === projectId) || null; }
}
export const deploymentStrategiesService = new DeploymentStrategiesService();
