import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { errorPagesService } from "../services/error-pages";

const router: IRouter = Router();

router.get("/projects/:projectId/error-pages", requireAuth, async (req, res): Promise<void> => {
  const pages = await errorPagesService.list(req.params.projectId as string);
  res.json(pages);
});

router.get("/projects/:projectId/error-pages/templates", requireAuth, async (_req, res): Promise<void> => {
  const templates = await errorPagesService.getTemplates();
  res.json(templates);
});

router.get("/projects/:projectId/error-pages/:id", requireAuth, async (req, res): Promise<void> => {
  const page = await errorPagesService.get(req.params.id as string);
  if (!page) { res.status(404).json({ error: "Not found" }); return; }
  res.json(page);
});

router.put("/projects/:projectId/error-pages", requireAuth, async (req, res): Promise<void> => {
  const page = await errorPagesService.upsert(req.params.projectId as string, req.body);
  res.json(page);
});

router.delete("/projects/:projectId/error-pages/:id", requireAuth, async (req, res): Promise<void> => {
  const ok = await errorPagesService.delete(req.params.id as string);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
