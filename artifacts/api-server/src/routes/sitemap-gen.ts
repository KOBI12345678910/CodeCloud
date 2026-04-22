import { Router, Request, Response } from "express";
import { sitemapGenService } from "../services/sitemap-gen";
const router = Router();
router.post("/sitemap-gen", (req: Request, res: Response): void => { const { baseUrl, pages } = req.body; res.type("application/xml").send(sitemapGenService.generate(baseUrl || "https://codecloud.app", pages || [])); });
router.post("/sitemap-gen/robots", (req: Request, res: Response): void => { const { baseUrl, disallow } = req.body; res.type("text/plain").send(sitemapGenService.generateRobotsTxt(baseUrl || "https://codecloud.app", disallow || [])); });
export default router;
