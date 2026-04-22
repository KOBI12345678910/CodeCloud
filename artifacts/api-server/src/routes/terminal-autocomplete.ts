import { Router, Request, Response } from "express";
import { terminalAutocompleteService } from "../services/terminal-autocomplete";
const router = Router();
router.post("/terminal-autocomplete", (req: Request, res: Response): void => { res.json(terminalAutocompleteService.complete(req.body.input || "")); });
router.post("/terminal-autocomplete/register", (req: Request, res: Response): void => { const { name, description, flags } = req.body; terminalAutocompleteService.registerCommand(name, description, flags || []); res.json({ success: true }); });
export default router;
