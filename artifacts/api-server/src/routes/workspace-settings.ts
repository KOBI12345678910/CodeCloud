import { Router, Request, Response } from "express";
import { workspaceSettingsService } from "../services/workspace-settings";
const router = Router();
router.get("/workspace-settings/defaults", (_req: Request, res: Response): void => { res.json(workspaceSettingsService.getDefaults()); });
router.get("/workspace-settings/:userId", (req: Request, res: Response): void => { res.json(workspaceSettingsService.get(req.params.userId as string)); });
router.put("/workspace-settings/:userId", (req: Request, res: Response): void => { res.json(workspaceSettingsService.update(req.params.userId as string, req.body)); });
router.post("/workspace-settings/:userId/reset", (req: Request, res: Response): void => { res.json(workspaceSettingsService.reset(req.params.userId as string)); });
export default router;
