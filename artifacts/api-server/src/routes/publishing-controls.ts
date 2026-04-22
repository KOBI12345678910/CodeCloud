import { Router } from "express";
const r = Router();

interface PublishConfig {
  projectId: string;
  approvalRequired: boolean;
  approvers: string[];
  autoPublish: boolean;
  publishOnMerge: boolean;
  environments: Array<{
    name: string;
    url: string;
    status: "active" | "paused" | "building";
    branch: string;
    autoPromote: boolean;
    protectionRules: string[];
  }>;
  rollbackEnabled: boolean;
  maxRollbackVersions: number;
  publishHistory: Array<{
    id: string;
    version: string;
    status: "published" | "rolled-back" | "failed";
    environment: string;
    publishedBy: string;
    approvedBy: string | null;
    publishedAt: string;
    commitHash: string;
    changelog: string;
  }>;
  badges: {
    removePoweredBy: boolean;
    customBadge: string | null;
  };
  prePublishChecks: Array<{
    name: string;
    enabled: boolean;
    required: boolean;
    command: string;
  }>;
  updatedAt: string;
}

const configs = new Map<string, PublishConfig>();

r.get("/publishing/:projectId", (req, res) => {
  const c = configs.get(req.params.projectId);
  if (!c) {
    return res.json({
      projectId: req.params.projectId,
      approvalRequired: false,
      approvers: [],
      autoPublish: false,
      publishOnMerge: false,
      environments: [
        { name: "production", url: "", status: "paused", branch: "main", autoPromote: false, protectionRules: [] },
        { name: "staging", url: "", status: "paused", branch: "develop", autoPromote: true, protectionRules: [] },
        { name: "preview", url: "", status: "paused", branch: "*", autoPromote: true, protectionRules: [] },
      ],
      rollbackEnabled: true,
      maxRollbackVersions: 10,
      publishHistory: [],
      badges: { removePoweredBy: false, customBadge: null },
      prePublishChecks: [
        { name: "Tests", enabled: true, required: true, command: "npm test" },
        { name: "Lint", enabled: true, required: false, command: "npm run lint" },
        { name: "Type check", enabled: true, required: true, command: "tsc --noEmit" },
        { name: "Security scan", enabled: false, required: false, command: "npm audit" },
        { name: "Build", enabled: true, required: true, command: "npm run build" },
      ],
      updatedAt: new Date().toISOString(),
    });
  }
  res.json(c);
});

r.patch("/publishing/:projectId", (req, res) => {
  let c = configs.get(req.params.projectId);
  if (!c) {
    c = {
      projectId: req.params.projectId,
      approvalRequired: false, approvers: [], autoPublish: false, publishOnMerge: false,
      environments: [], rollbackEnabled: true, maxRollbackVersions: 10,
      publishHistory: [], badges: { removePoweredBy: false, customBadge: null },
      prePublishChecks: [], updatedAt: new Date().toISOString(),
    };
  }
  const fields = ["approvalRequired", "approvers", "autoPublish", "publishOnMerge", "environments", "rollbackEnabled", "maxRollbackVersions", "prePublishChecks"];
  for (const f of fields) if (req.body[f] !== undefined) (c as any)[f] = req.body[f];
  if (req.body.badges) Object.assign(c.badges, req.body.badges);
  c.updatedAt = new Date().toISOString();
  configs.set(req.params.projectId, c);
  res.json(c);
});

r.post("/publishing/:projectId/publish", (req, res) => {
  const { environment = "production", changelog = "", commitHash = "" } = req.body;
  let c = configs.get(req.params.projectId);
  if (!c) return res.status(404).json({ error: "configure publishing first" });
  if (c.approvalRequired && !req.body.approvedBy) {
    return res.status(403).json({ error: "approval required", approvers: c.approvers });
  }
  const entry = {
    id: `pub_${Date.now()}`,
    version: `v${c.publishHistory.length + 1}.0.0`,
    status: "published" as const,
    environment, publishedBy: "current-user",
    approvedBy: req.body.approvedBy || null,
    publishedAt: new Date().toISOString(),
    commitHash: commitHash || `abc${Date.now().toString(16).slice(-7)}`,
    changelog,
  };
  c.publishHistory.unshift(entry);
  if (c.publishHistory.length > c.maxRollbackVersions) c.publishHistory = c.publishHistory.slice(0, c.maxRollbackVersions);
  c.updatedAt = new Date().toISOString();
  res.status(201).json(entry);
});

r.post("/publishing/:projectId/rollback/:publishId", (req, res) => {
  const c = configs.get(req.params.projectId);
  if (!c) return res.status(404).json({ error: "not found" });
  if (!c.rollbackEnabled) return res.status(403).json({ error: "rollback disabled" });
  const entry = c.publishHistory.find(e => e.id === req.params.publishId);
  if (!entry) return res.status(404).json({ error: "version not found" });
  entry.status = "rolled-back";
  res.json({ rolledBack: true, version: entry.version });
});

export default r;
