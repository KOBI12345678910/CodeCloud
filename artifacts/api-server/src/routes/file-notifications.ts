import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getWatchList, addWatch, removeWatch, getFileNotifications, markNotificationRead } from "../services/file-notifications";

const router: IRouter = Router();

router.get("/projects/:id/file-watches", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as any).auth?.userId || "user";
  try { res.json(getWatchList(projectId, userId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/file-watches", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as any).auth?.userId || "user";
  const { filePath } = req.body;
  if (!filePath) { res.status(400).json({ error: "filePath required" }); return; }
  try { res.status(201).json(addWatch(projectId, userId, filePath)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/projects/:id/file-watches/:watchId", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as any).auth?.userId || "user";
  const watchId = Array.isArray(req.params.watchId) ? req.params.watchId[0] : req.params.watchId;
  try { res.json(removeWatch(projectId, userId, watchId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/file-notifications", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as any).auth?.userId || "user";
  try { res.json(getFileNotifications(projectId, userId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/projects/:id/file-notifications/:notifId/read", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const notifId = Array.isArray(req.params.notifId) ? req.params.notifId[0] : req.params.notifId;
  try { res.json(markNotificationRead(notifId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
