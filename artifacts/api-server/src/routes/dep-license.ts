import { Router, Request, Response } from "express";
import { depLicenseService } from "../services/dep-license";
const router = Router();
router.post("/dep-license/check", (req: Request, res: Response): void => { const { dependencies, isCommercial } = req.body; res.json(depLicenseService.check(dependencies || [], isCommercial)); });
export default router;
