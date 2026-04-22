import { Router, Request, Response } from "express";
import { emailService } from "../services/email-service";
const router = Router();
router.post("/email-service/send", (req: Request, res: Response): void => { res.json(emailService.send(req.body)); });
router.post("/email-service/welcome", (req: Request, res: Response): void => { res.json(emailService.sendWelcome(req.body.to, req.body.userName)); });
router.post("/email-service/password-reset", (req: Request, res: Response): void => { res.json(emailService.sendPasswordReset(req.body.to, req.body.token)); });
router.post("/email-service/deploy-notification", (req: Request, res: Response): void => { res.json(emailService.sendDeployNotification(req.body.to, req.body.projectName, req.body.url)); });
router.get("/email-service/history", (req: Request, res: Response): void => { res.json(emailService.getHistory(req.query.to as string)); });
export default router;
