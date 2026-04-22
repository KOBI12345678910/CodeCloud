import { Router, Request, Response } from "express";
import { securityPatchingService } from "../services/security-patching";
const router = Router();
router.post("/security-patching/scan", (req: Request, res: Response): void => { res.json(securityPatchingService.scan(req.body.dependencies || [])); });
router.get("/security-patching/vulnerabilities", (_req: Request, res: Response): void => { res.json(securityPatchingService.getVulnerabilities()); });
router.post("/security-patching/patch/:vulnId", (req: Request, res: Response): void => { try { res.json(securityPatchingService.applyPatch(req.params.vulnId as string)); } catch (e: any) { res.status(404).json({ error: e.message }); } });
router.post("/security-patching/patch-all", (_req: Request, res: Response): void => { res.json(securityPatchingService.applyAll()); });
router.get("/security-patching/patches", (_req: Request, res: Response): void => { res.json(securityPatchingService.getPatches()); });
export default router;
