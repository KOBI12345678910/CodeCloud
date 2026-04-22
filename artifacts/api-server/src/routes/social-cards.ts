import { Router, Request, Response } from "express";
import { socialCardsService } from "../services/social-cards";
const router = Router();
router.post("/social-cards", (req: Request, res: Response): void => { const card = socialCardsService.generate(req.body); res.json({ card, metaTags: socialCardsService.getMetaTags(card) }); });
export default router;
