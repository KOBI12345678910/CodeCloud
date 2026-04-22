import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getCacheStats, getCacheRules, purgeCache, getCdnConfig, addCacheRule, removeCacheRule, setCacheRules } from "../services/cdn-cache";

const router: IRouter = Router();

router.get("/projects/:id/cdn/stats", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getCacheStats(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/cdn/rules", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getCacheRules(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/projects/:id/cdn/rules", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(setCacheRules(projectId, req.body.rules)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/cdn/rules", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.status(201).json(addCacheRule(projectId, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/projects/:id/cdn/rules/:ruleId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;
    removeCacheRule(projectId, ruleId) ? res.json({ success: true }) : res.status(404).json({ error: "Rule not found" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/cdn/purge", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(purgeCache(projectId, req.body.patterns)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/cdn/config", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getCdnConfig(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
