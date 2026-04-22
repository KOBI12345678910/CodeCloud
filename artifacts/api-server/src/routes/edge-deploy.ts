import { Router, Request, Response } from "express";
import { edgeDeployService } from "../services/edge-deploy";

const router = Router();

router.get("/edge-functions", (req: Request, res: Response): void => {
  res.json({ functions: edgeDeployService.list(req.query.projectId as string) });
});

router.post("/edge-functions", (req: Request, res: Response): void => {
  const { projectId, name, code, route, regions } = req.body;
  if (!projectId || !name || !code || !route) { res.status(400).json({ error: "projectId, name, code, route required" }); return; }
  res.status(201).json(edgeDeployService.deploy(projectId, name, code, route, regions));
});

router.get("/edge-functions/:id", (req: Request, res: Response): void => {
  const fn = edgeDeployService.get(req.params.id as string);
  if (!fn) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fn);
});

router.put("/edge-functions/:id", (req: Request, res: Response): void => {
  const fn = edgeDeployService.update(req.params.id as string, req.body);
  if (!fn) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fn);
});

router.post("/edge-functions/:id/invoke", (req: Request, res: Response): void => {
  const result = edgeDeployService.invoke(req.params.id as string);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
});

router.delete("/edge-functions/:id", (req: Request, res: Response): void => {
  if (!edgeDeployService.delete(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
