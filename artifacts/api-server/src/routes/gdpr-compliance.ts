import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requestDataExport,
  requestAccountDeletion,
  cancelDeletion,
  getUserDsarRequests,
  getExportData,
} from "../services/gdpr-compliance";

const router = Router();

router.post("/gdpr-compliance/export", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const result = await requestDataExport(user.id);
  if ("error" in result) {
    res.status(429).json({ error: result.error });
    return;
  }
  res.json(result);
});

router.get("/gdpr-compliance/export/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const data = await getExportData(req.params.id as string, user.id);
  data ? res.json(data) : res.status(404).json({ error: "Not found" });
});

router.get("/gdpr-compliance/exports", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const requests = await getUserDsarRequests(user.id);
  res.json(requests.filter(r => r.type === "export"));
});

router.post("/gdpr-compliance/deletion", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const result = await requestAccountDeletion(user.id, req.body.reason);
  res.json(result);
});

router.get("/gdpr-compliance/deletions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const requests = await getUserDsarRequests(user.id);
  res.json(requests.filter(r => r.type === "deletion"));
});

router.post("/gdpr-compliance/deletion/:id/cancel", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const success = await cancelDeletion(req.params.id as string, user.id);
  success ? res.json({ success: true }) : res.status(404).json({ error: "Cannot cancel" });
});

export default router;
