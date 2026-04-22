import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getSections, generateReadme, toggleAutoUpdate, updateSection, refreshSection } from "../services/readme-updater";

const router: IRouter = Router();

router.get("/projects/:projectId/readme/sections", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getSections(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:projectId/readme/generate", requireAuth, async (req, res): Promise<void> => {
  try { res.json(generateReadme(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:projectId/readme/sections/:sectionId/toggle", requireAuth, async (req, res): Promise<void> => {
  const result = toggleAutoUpdate(req.params.projectId as string, req.params.sectionId as string);
  if (!result) { res.status(404).json({ error: "Section not found" }); return; }
  res.json(result);
});

router.put("/projects/:projectId/readme/sections/:sectionId", requireAuth, async (req, res): Promise<void> => {
  const result = updateSection(req.params.projectId as string, req.params.sectionId as string, req.body.content);
  if (!result) { res.status(404).json({ error: "Section not found" }); return; }
  res.json(result);
});

router.post("/projects/:projectId/readme/sections/:sectionId/refresh", requireAuth, async (req, res): Promise<void> => {
  const result = refreshSection(req.params.projectId as string, req.params.sectionId as string);
  if (!result) { res.status(404).json({ error: "Section not found" }); return; }
  res.json(result);
});

export default router;
