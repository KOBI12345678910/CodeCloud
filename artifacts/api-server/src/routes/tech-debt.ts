import { Router, Request, Response } from "express";
import { techDebtService } from "../services/tech-debt";

const router = Router();

router.post("/tech-debt/scan", (req: Request, res: Response): void => {
  const { files } = req.body;
  if (!files || !Array.isArray(files)) { res.status(400).json({ error: "files array required" }); return; }
  res.json({ items: techDebtService.scan(files) });
});

router.get("/tech-debt/report", (_req: Request, res: Response): void => {
  res.json(techDebtService.getReport());
});

router.get("/tech-debt/items", (req: Request, res: Response): void => {
  res.json({ items: techDebtService.getItems(req.query.type as string, req.query.severity as string) });
});

router.post("/tech-debt/:id/resolve", (req: Request, res: Response): void => {
  if (!techDebtService.resolve(req.params.id as string)) { res.status(404).json({ error: "Item not found" }); return; }
  res.json({ success: true });
});

export default router;
