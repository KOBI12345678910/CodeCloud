import { Router, Request, Response } from "express";
import { requestValidationService } from "../services/request-validation";

const router = Router();

router.get("/request-validation", (req: Request, res: Response): void => {
  res.json({ schemas: requestValidationService.list(req.query.deploymentId as string) });
});

router.post("/request-validation", (req: Request, res: Response): void => {
  const { deploymentId, endpoint, method, schema } = req.body;
  if (!deploymentId || !endpoint || !method || !schema) { res.status(400).json({ error: "deploymentId, endpoint, method, schema required" }); return; }
  res.status(201).json(requestValidationService.create(deploymentId, endpoint, method, schema));
});

router.post("/request-validation/:id/validate", (req: Request, res: Response): void => {
  res.json(requestValidationService.validate(req.params.id as string, req.body));
});

router.get("/request-validation/metrics", (_req: Request, res: Response): void => {
  res.json(requestValidationService.getMetrics());
});

router.delete("/request-validation/:id", (req: Request, res: Response): void => {
  if (!requestValidationService.delete(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
