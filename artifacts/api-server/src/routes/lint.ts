import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { lintFile, lintFiles } from "../services/linter";

const router = Router();

router.post("/lint", requireAuth, async (req, res): Promise<void> => {
  const { filename, content } = req.body;
  if (!filename || typeof content !== "string") {
    res.status(400).json({ error: "filename and content are required" });
    return;
  }
  const diagnostics = lintFile(filename, content);
  res.json({ diagnostics });
});

router.post("/lint/batch", requireAuth, async (req, res): Promise<void> => {
  const { files } = req.body;
  if (!Array.isArray(files)) {
    res.status(400).json({ error: "files array is required" });
    return;
  }
  const diagnostics = lintFiles(files);
  res.json({ diagnostics });
});

export default router;
