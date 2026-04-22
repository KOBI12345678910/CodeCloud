import { Router } from "express";
const r = Router();

interface ScalePolicy {
  id: string;
  projectId: string;
  deploymentId: string;
  minReplicas: number;
  maxReplicas: number;
  targetCpuPercent: number;
  targetMemoryPercent: number;
  targetRps: number;
  scaleUpCooldownSec: number;
  scaleDownCooldownSec: number;
  strategy: "cpu" | "memory" | "rps" | "custom";
  enabled: boolean;
  currentReplicas: number;
  lastScaleEvent: string | null;
  createdAt: string;
  updatedAt: string;
}

const policies = new Map<string, ScalePolicy>();

r.get("/autoscale/:projectId/policies", (req, res) => {
  const { projectId } = req.params;
  const list = [...policies.values()].filter(p => p.projectId === projectId);
  res.json({ policies: list, total: list.length });
});

r.post("/autoscale/:projectId/policies", (req, res) => {
  const { projectId } = req.params;
  const { deploymentId, minReplicas = 1, maxReplicas = 10, targetCpuPercent = 70, targetMemoryPercent = 80, targetRps = 1000, scaleUpCooldownSec = 60, scaleDownCooldownSec = 300, strategy = "cpu" } = req.body;
  if (!deploymentId) return res.status(400).json({ error: "deploymentId required" });
  if (minReplicas < 0 || maxReplicas < minReplicas) return res.status(400).json({ error: "invalid replica range" });
  const id = `asp_${Date.now()}`;
  const policy: ScalePolicy = {
    id, projectId, deploymentId, minReplicas, maxReplicas,
    targetCpuPercent, targetMemoryPercent, targetRps,
    scaleUpCooldownSec, scaleDownCooldownSec, strategy,
    enabled: true, currentReplicas: minReplicas,
    lastScaleEvent: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  policies.set(id, policy);
  res.status(201).json(policy);
});

r.patch("/autoscale/:projectId/policies/:policyId", (req, res) => {
  const p = policies.get(req.params.policyId);
  if (!p || p.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  const allowed = ["minReplicas", "maxReplicas", "targetCpuPercent", "targetMemoryPercent", "targetRps", "scaleUpCooldownSec", "scaleDownCooldownSec", "strategy", "enabled"] as const;
  for (const k of allowed) if (req.body[k] !== undefined) (p as any)[k] = req.body[k];
  p.updatedAt = new Date().toISOString();
  res.json(p);
});

r.delete("/autoscale/:projectId/policies/:policyId", (req, res) => {
  const p = policies.get(req.params.policyId);
  if (!p || p.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  policies.delete(req.params.policyId);
  res.json({ deleted: true });
});

r.get("/autoscale/:projectId/metrics", (req, res) => {
  const { projectId } = req.params;
  const list = [...policies.values()].filter(p => p.projectId === projectId);
  res.json({
    projectId,
    policies: list.length,
    metrics: list.map(p => ({
      policyId: p.id, deploymentId: p.deploymentId,
      currentReplicas: p.currentReplicas,
      cpuUsagePercent: Math.round(Math.random() * 100),
      memoryUsagePercent: Math.round(Math.random() * 100),
      rps: Math.round(Math.random() * 2000),
      scaleEvents24h: Math.floor(Math.random() * 10),
    })),
  });
});

r.post("/autoscale/:projectId/scale", (req, res) => {
  const { policyId, replicas } = req.body;
  const p = policies.get(policyId);
  if (!p || p.projectId !== req.params.projectId) return res.status(404).json({ error: "policy not found" });
  if (replicas < p.minReplicas || replicas > p.maxReplicas) return res.status(400).json({ error: `replicas must be ${p.minReplicas}-${p.maxReplicas}` });
  p.currentReplicas = replicas;
  p.lastScaleEvent = new Date().toISOString();
  res.json({ scaled: true, currentReplicas: replicas });
});

export default r;
