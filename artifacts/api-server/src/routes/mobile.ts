import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { mobileApiService } from "../services/mobile-api";

const router: IRouter = Router();

router.get("/mobile/dashboard", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const data = await mobileApiService.getDashboard(userId);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/mobile/projects/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = await mobileApiService.getProjectQuickView(req.params.id as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/mobile/projects/:projectId/files/:fileId", requireAuth, async (req, res): Promise<void> => {
  try {
    const data = await mobileApiService.getFileContent(req.params.projectId as string, req.params.fileId as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/mobile/projects/:id/sync", requireAuth, async (req, res): Promise<void> => {
  try {
    const since = new Date(req.query.since as string || 0);
    const data = await mobileApiService.getChangedFiles(req.params.id as string, since);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
