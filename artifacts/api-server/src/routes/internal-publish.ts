import { Router } from "express";
const r = Router();

interface InternalDeployment {
  id: string;
  projectId: string;
  name: string;
  visibility: "public" | "internal" | "private";
  accessList: string[];
  accessType: "org" | "team" | "user-list" | "ip-range";
  allowedIps: string[];
  allowedTeams: string[];
  requireAuth: boolean;
  passwordProtected: boolean;
  passwordHash: string | null;
  url: string;
  internalUrl: string;
  status: "deployed" | "stopped" | "building";
  createdAt: string;
  updatedAt: string;
}

const deployments = new Map<string, InternalDeployment>();

r.get("/internal-publish/:projectId", (req, res) => {
  const list = [...deployments.values()].filter(d => d.projectId === req.params.projectId);
  res.json({ deployments: list, total: list.length });
});

r.post("/internal-publish/:projectId", (req, res) => {
  const { projectId } = req.params;
  const { name, visibility = "internal", accessType = "org", accessList = [], allowedIps = [], allowedTeams = [], requireAuth = true, passwordProtected = false, password } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const id = `ip_${Date.now()}`;
  const d: InternalDeployment = {
    id, projectId, name, visibility, accessList, accessType, allowedIps, allowedTeams,
    requireAuth, passwordProtected, passwordHash: passwordProtected ? `hashed_${password}` : null,
    url: `https://${name.toLowerCase().replace(/\s+/g, "-")}.codecloud.app`,
    internalUrl: `https://${name.toLowerCase().replace(/\s+/g, "-")}.internal.codecloud.app`,
    status: "deployed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  deployments.set(id, d);
  res.status(201).json(d);
});

r.patch("/internal-publish/:projectId/:deployId/visibility", (req, res) => {
  const d = deployments.get(req.params.deployId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  const { visibility, accessList, accessType, allowedIps, allowedTeams, requireAuth, passwordProtected, password } = req.body;
  if (visibility) d.visibility = visibility;
  if (accessList) d.accessList = accessList;
  if (accessType) d.accessType = accessType;
  if (allowedIps) d.allowedIps = allowedIps;
  if (allowedTeams) d.allowedTeams = allowedTeams;
  if (requireAuth !== undefined) d.requireAuth = requireAuth;
  if (passwordProtected !== undefined) {
    d.passwordProtected = passwordProtected;
    d.passwordHash = passwordProtected ? `hashed_${password}` : null;
  }
  d.updatedAt = new Date().toISOString();
  res.json(d);
});

r.delete("/internal-publish/:projectId/:deployId", (req, res) => {
  const d = deployments.get(req.params.deployId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  deployments.delete(req.params.deployId);
  res.json({ deleted: true });
});

export default r;
