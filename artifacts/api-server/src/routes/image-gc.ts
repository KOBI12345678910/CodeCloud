import { Router, Request, Response } from "express";
import { imageGCService } from "../jobs/image-gc";

const router = Router();

router.get("/image-gc/images", (_req: Request, res: Response): void => {
  res.json({ images: imageGCService.getImages() });
});

router.post("/image-gc/images", (req: Request, res: Response): void => {
  const { tag, sizeMB } = req.body;
  if (!tag) { res.status(400).json({ error: "tag required" }); return; }
  res.status(201).json(imageGCService.addImage(tag, sizeMB || 0));
});

router.post("/image-gc/run", (_req: Request, res: Response): void => {
  res.json(imageGCService.runGC());
});

router.get("/image-gc/schedule", (_req: Request, res: Response): void => {
  res.json(imageGCService.getSchedule());
});

router.put("/image-gc/schedule", (req: Request, res: Response): void => {
  res.json(imageGCService.updateSchedule(req.body));
});

router.get("/image-gc/history", (_req: Request, res: Response): void => {
  res.json({ history: imageGCService.getHistory() });
});

router.get("/image-gc/metrics", (_req: Request, res: Response): void => {
  res.json(imageGCService.getMetrics());
});

export default router;
