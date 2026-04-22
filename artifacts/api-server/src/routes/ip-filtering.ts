import { Router, Request, Response } from "express";
import { ipFilteringService } from "../services/ip-filtering";
const router = Router();
router.get("/ip-filtering/:orgId", (req: Request, res: Response): void => { res.json(ipFilteringService.listRules(req.params.orgId as string)); });
router.post("/ip-filtering", (req: Request, res: Response): void => { res.status(201).json(ipFilteringService.addRule(req.body)); });
router.post("/ip-filtering/check", (req: Request, res: Response): void => { res.json(ipFilteringService.checkIP(req.body.orgId, req.body.ip)); });
router.post("/ip-filtering/:id/toggle", (req: Request, res: Response): void => { const r = ipFilteringService.toggleRule(req.params.id as string); r ? res.json(r) : res.status(404).json({ error: "Not found" }); });
router.delete("/ip-filtering/:id", (req: Request, res: Response): void => { ipFilteringService.deleteRule(req.params.id as string) ? res.json({ success: true }) : res.status(404).json({ error: "Not found" }); });
export default router;
