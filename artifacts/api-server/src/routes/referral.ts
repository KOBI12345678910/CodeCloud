import { Router, Request, Response } from "express";
import { referralService } from "../services/referral";
const router = Router();
router.post("/referral/generate-code", (req: Request, res: Response): void => { res.json({ code: referralService.generateCode(req.body.userId) }); });
router.post("/referral", (req: Request, res: Response): void => { res.status(201).json(referralService.createReferral(req.body.referrerId, req.body.referredEmail)); });
router.post("/referral/convert", (req: Request, res: Response): void => { const r = referralService.convert(req.body.code, req.body.newUserId); r ? res.json(r) : res.status(404).json({ error: "Invalid code" }); });
router.get("/referral/:userId", (req: Request, res: Response): void => { res.json(referralService.getByUser(req.params.userId as string)); });
router.get("/referral/:userId/stats", (req: Request, res: Response): void => { res.json(referralService.getStats(req.params.userId as string)); });
export default router;
