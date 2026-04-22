import { Router, Request, Response } from "express";
import { logFormatService } from "../services/log-format";

const router = Router();

router.get("/log-formats", (req: Request, res: Response): void => {
  res.json({ formats: logFormatService.list(req.query.deploymentId as string) });
});

router.post("/log-formats", (req: Request, res: Response): void => {
  const { deploymentId, name, format } = req.body;
  if (!deploymentId || !name) { res.status(400).json({ error: "deploymentId and name required" }); return; }
  res.status(201).json(logFormatService.create(deploymentId, name, format || "json"));
});

router.get("/log-formats/:id", (req: Request, res: Response): void => {
  const lf = logFormatService.get(req.params.id as string);
  if (!lf) { res.status(404).json({ error: "Not found" }); return; }
  res.json(lf);
});

router.put("/log-formats/:id", (req: Request, res: Response): void => {
  const lf = logFormatService.update(req.params.id as string, req.body);
  if (!lf) { res.status(404).json({ error: "Not found" }); return; }
  res.json(lf);
});

router.get("/log-formats/:id/preview", (req: Request, res: Response): void => {
  const preview = logFormatService.preview(req.params.id as string);
  if (!preview) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ preview });
});

router.delete("/log-formats/:id", (req: Request, res: Response): void => {
  if (!logFormatService.delete(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
