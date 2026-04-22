import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const r = Router();
r.get("/user-preferences", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ theme: "dark", fontSize: 14, tabSize: 2, wordWrap: true, minimap: true, autoSave: true }); });
r.put("/user-preferences", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
r.get("/user-preferences/keybindings", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ keybindings: [] }); });
r.put("/user-preferences/keybindings", requireAuth, async (req: Request, res: Response): Promise<void> => { res.json({ updated: true }); });
export default r;
