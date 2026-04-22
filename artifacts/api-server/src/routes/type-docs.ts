import { Router, Request, Response } from "express";
import { typeDocsService } from "../services/type-docs";
const router = Router();
router.post("/type-docs/extract", (req: Request, res: Response): void => { const { content, file } = req.body; res.json(typeDocsService.extractTypes(content || "", file || "unknown.ts")); });
router.post("/type-docs/markdown", (req: Request, res: Response): void => { res.json({ markdown: typeDocsService.generateMarkdown(req.body.docs || []) }); });
export default router;
