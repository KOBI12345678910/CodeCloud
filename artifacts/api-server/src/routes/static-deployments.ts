import { Router } from "express";
const r = Router();

interface StaticDeployment {
  id: string;
  projectId: string;
  name: string;
  framework: "react" | "vue" | "svelte" | "next" | "nuxt" | "astro" | "vanilla" | "angular" | "hugo" | "gatsby";
  buildCommand: string;
  outputDir: string;
  status: "building" | "deployed" | "failed" | "queued";
  url: string | null;
  customDomain: string | null;
  cdn: { enabled: boolean; regions: string[]; cacheMaxAge: number };
  headers: Record<string, string>;
  redirects: Array<{ from: string; to: string; status: number }>;
  rewrites: Array<{ source: string; destination: string }>;
  envVars: Record<string, string>;
  spaFallback: boolean;
  cleanUrls: boolean;
  trailingSlash: boolean;
  createdAt: string;
  deployedAt: string | null;
  buildDurationMs: number | null;
  sizeBytes: number | null;
}

const deploys = new Map<string, StaticDeployment>();

r.get("/static-deploy/:projectId", (req, res) => {
  const list = [...deploys.values()].filter(d => d.projectId === req.params.projectId);
  res.json({ deployments: list, total: list.length });
});

r.post("/static-deploy/:projectId", (req, res) => {
  const { projectId } = req.params;
  const { name, framework = "react", buildCommand = "npm run build", outputDir = "dist", customDomain, spaFallback = true, cleanUrls = true, trailingSlash = false, headers = {}, redirects = [], rewrites = [], envVars = {} } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const id = `sd_${Date.now()}`;
  const d: StaticDeployment = {
    id, projectId, name, framework, buildCommand, outputDir,
    status: "building",
    url: `https://${name.toLowerCase().replace(/\s+/g, "-")}.codecloud.app`,
    customDomain: customDomain || null,
    cdn: { enabled: true, regions: ["us-east-1", "eu-west-1", "ap-southeast-1"], cacheMaxAge: 86400 },
    headers, redirects, rewrites, envVars,
    spaFallback, cleanUrls, trailingSlash,
    createdAt: new Date().toISOString(),
    deployedAt: null, buildDurationMs: null, sizeBytes: null,
  };
  deploys.set(id, d);
  setTimeout(() => {
    d.status = "deployed";
    d.deployedAt = new Date().toISOString();
    d.buildDurationMs = 2000 + Math.random() * 8000;
    d.sizeBytes = Math.floor(100000 + Math.random() * 5000000);
  }, 2000);
  res.status(201).json(d);
});

r.patch("/static-deploy/:projectId/:deployId", (req, res) => {
  const d = deploys.get(req.params.deployId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  const allowed = ["name", "framework", "buildCommand", "outputDir", "customDomain", "spaFallback", "cleanUrls", "trailingSlash", "headers", "redirects", "rewrites", "envVars"] as const;
  for (const k of allowed) if (req.body[k] !== undefined) (d as any)[k] = req.body[k];
  res.json(d);
});

r.post("/static-deploy/:projectId/:deployId/redeploy", (req, res) => {
  const d = deploys.get(req.params.deployId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  d.status = "building";
  d.deployedAt = null;
  setTimeout(() => {
    d.status = "deployed";
    d.deployedAt = new Date().toISOString();
    d.buildDurationMs = 1500 + Math.random() * 6000;
  }, 1500);
  res.json({ redeploying: true, deploymentId: d.id });
});

r.delete("/static-deploy/:projectId/:deployId", (req, res) => {
  const d = deploys.get(req.params.deployId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  deploys.delete(req.params.deployId);
  res.json({ deleted: true });
});

r.post("/static-deploy/:projectId/:deployId/invalidate-cache", (req, res) => {
  const d = deploys.get(req.params.deployId);
  if (!d || d.projectId !== req.params.projectId) return res.status(404).json({ error: "not found" });
  res.json({ invalidated: true, regions: d.cdn.regions, timestamp: new Date().toISOString() });
});

export default r;
