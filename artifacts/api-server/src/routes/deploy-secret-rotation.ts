import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getSecretRotations, rotateSecret } from "../services/deploy-secret-rotation";

const router: IRouter = Router();

router.get("/projects/:id/secret-rotations", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getSecretRotations(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/secret-rotations/:secretId/rotate", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const secretId = Array.isArray(req.params.secretId) ? req.params.secretId[0] : req.params.secretId;
  try { res.json(rotateSecret(projectId, secretId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
