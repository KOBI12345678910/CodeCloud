import { Router, Request, Response } from "express";
import { fileDiffService } from "../services/file-diff";
const router = Router();
router.post("/file-diff", (req: Request, res: Response): void => { const { oldContent, newContent, oldFile, newFile } = req.body; res.json(fileDiffService.diff(oldContent || "", newContent || "", oldFile, newFile)); });
export default router;
