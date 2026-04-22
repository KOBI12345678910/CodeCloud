export interface Pipeline {
  id: string;
  projectId: string;
  name: string;
  stages: PipelineStage[];
  status: "idle" | "running" | "success" | "failed";
  trigger: "manual" | "push" | "schedule";
  lastRun: Date | null;
  createdAt: Date;
}

export interface PipelineStage {
  name: string;
  type: "build" | "test" | "deploy" | "notify" | "approval";
  status: "pending" | "running" | "success" | "failed" | "skipped";
  duration: number | null;
  config: Record<string, any>;
}

class DeployPipelineService {
  private pipelines: Map<string, Pipeline> = new Map();

  create(data: { projectId: string; name: string; trigger?: Pipeline["trigger"]; stages: Omit<PipelineStage, "status" | "duration">[] }): Pipeline {
    const id = `pipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pipeline: Pipeline = {
      id, projectId: data.projectId, name: data.name,
      stages: data.stages.map(s => ({ ...s, status: "pending" as const, duration: null })),
      status: "idle", trigger: data.trigger || "manual", lastRun: null, createdAt: new Date(),
    };
    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  run(id: string): Pipeline | null {
    const p = this.pipelines.get(id); if (!p) return null;
    p.status = "running"; p.lastRun = new Date();
    for (const stage of p.stages) {
      stage.status = "running";
      stage.duration = Math.floor(Math.random() * 30000) + 1000;
      stage.status = Math.random() > 0.05 ? "success" : "failed";
      if (stage.status === "failed") { p.status = "failed"; break; }
    }
    if (p.status === "running") p.status = "success";
    return p;
  }

  get(id: string): Pipeline | null { return this.pipelines.get(id) || null; }
  listByProject(projectId: string): Pipeline[] { return Array.from(this.pipelines.values()).filter(p => p.projectId === projectId); }
  delete(id: string): boolean { return this.pipelines.delete(id); }
}

export const deployPipelineService = new DeployPipelineService();
