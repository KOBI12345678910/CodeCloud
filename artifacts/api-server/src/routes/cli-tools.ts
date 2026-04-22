import { Router, Request, Response } from "express";
import { cliToolsService } from "../services/cli-tools";
const router = Router();
router.get("/cli-tools", (_req: Request, res: Response): void => { res.json(cliToolsService.list()); });
router.get("/cli-tools/version", (_req: Request, res: Response): void => { res.json(cliToolsService.getVersion()); });
router.get("/cli-tools/:name", (req: Request, res: Response): void => { const c = cliToolsService.get(req.params.name as string); c ? res.json(c) : res.status(404).json({ error: "Not found" }); });
export default router;
