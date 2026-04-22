import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  SUPPORTED_VERSIONS,
  DEFAULT_CONFIG,
  getDefaultConfigForLanguage,
  validateConfig,
  generateDockerfile,
} from "../services/environment";

const router = Router();

router.get("/environment/versions", (_req: Request, res: Response): void => {
  res.json(SUPPORTED_VERSIONS);
});

router.get("/environment/defaults", (_req: Request, res: Response): void => {
  res.json(DEFAULT_CONFIG);
});

router.get("/environment/defaults/:language", (req: Request, res: Response): void => {
  const language = req.params["language"] as string;
  res.json(getDefaultConfigForLanguage(language));
});

router.post("/environment/validate", requireAuth, (req: Request, res: Response): void => {
  const errors = validateConfig(req.body);
  if (errors.length > 0) {
    res.status(400).json({ valid: false, errors });
    return;
  }
  res.json({ valid: true, errors: [] });
});

router.post("/environment/dockerfile", requireAuth, (req: Request, res: Response): void => {
  const { language, config } = req.body;
  if (!language || !config) {
    res.status(400).json({ error: "language and config are required" });
    return;
  }
  const errors = validateConfig(config);
  if (errors.length > 0) {
    res.status(400).json({ error: "Invalid config", errors });
    return;
  }
  const dockerfile = generateDockerfile(language, config);
  res.json({ dockerfile });
});

export default router;
