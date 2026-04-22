import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { detectVulnerableDeps, createPatchPR } from "../services/auto-patch";
import { db } from "@workspace/db";
import { filesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/projects/:id/security/vulnerabilities", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const files = await db.select().from(filesTable).where(eq(filesTable.projectId, projectId));
    const pkgFile = files.find(f => f.name === "package.json" && !f.path.includes("node_modules"));
    let deps: Record<string, string> = {};
    if (pkgFile?.content) { try { const pkg = JSON.parse(pkgFile.content); deps = { ...pkg.dependencies, ...pkg.devDependencies }; } catch {} }
    res.json(detectVulnerableDeps(deps));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/security/auto-patch", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { vulnerabilities } = req.body;
  if (!vulnerabilities?.length) { res.status(400).json({ error: "vulnerabilities required" }); return; }
  try { res.json(createPatchPR(projectId, vulnerabilities)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
