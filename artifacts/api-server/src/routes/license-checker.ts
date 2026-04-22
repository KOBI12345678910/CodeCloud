import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { scanDependencies, generateSBOM } from "../services/license-checker";

const router: IRouter = Router();

router.get("/projects/:id/licenses", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(await scanDependencies(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/licenses/sbom", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { const report = await scanDependencies(projectId); res.json(generateSBOM(report)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
