import { Router, Request, Response } from "express";
import { codeSearchService } from "../services/code-search";
const router = Router();
router.post("/code-search", (req: Request, res: Response): void => { const { files, options } = req.body; res.json(codeSearchService.search(files || [], { query: options?.query || "", isRegex: options?.isRegex || false, caseSensitive: options?.caseSensitive || false, wholeWord: options?.wholeWord || false, includePattern: options?.includePattern || null, excludePattern: options?.excludePattern || null, maxResults: options?.maxResults || 100 })); });
router.post("/code-search/replace", (req: Request, res: Response): void => { const { content, options, replacement } = req.body; res.json(codeSearchService.replace(content || "", { query: options?.query || "", isRegex: options?.isRegex || false, caseSensitive: options?.caseSensitive || false, wholeWord: options?.wholeWord || false, includePattern: null, excludePattern: null, maxResults: 1000 }, replacement || "")); });
export default router;
