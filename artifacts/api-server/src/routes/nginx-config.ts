import { Router, Request, Response } from "express";
import { nginxConfigService } from "../services/nginx-config";

const router = Router();

router.get("/nginx-config", (req: Request, res: Response): void => {
  const projectId = req.query.projectId as string;
  if (projectId) {
    res.json({ configs: nginxConfigService.getByProject(projectId) });
  } else {
    res.json({ configs: [] });
  }
});

router.post("/nginx-config", (req: Request, res: Response): void => {
  const { projectId, name } = req.body;
  if (!projectId || !name) { res.status(400).json({ error: "projectId and name required" }); return; }
  res.status(201).json(nginxConfigService.create(projectId, name));
});

router.get("/nginx-config/:id", (req: Request, res: Response): void => {
  const config = nginxConfigService.get(req.params.id as string);
  if (!config) { res.status(404).json({ error: "Config not found" }); return; }
  res.json(config);
});

router.put("/nginx-config/:id", (req: Request, res: Response): void => {
  const config = nginxConfigService.update(req.params.id as string, req.body);
  if (!config) { res.status(404).json({ error: "Config not found" }); return; }
  res.json(config);
});

router.delete("/nginx-config/:id", (req: Request, res: Response): void => {
  if (!nginxConfigService.delete(req.params.id as string)) { res.status(404).json({ error: "Config not found" }); return; }
  res.json({ success: true });
});

router.post("/nginx-config/validate", (req: Request, res: Response): void => {
  const { config } = req.body;
  if (!config) { res.status(400).json({ error: "config string required" }); return; }
  res.json(nginxConfigService.validate(config));
});

export default router;
