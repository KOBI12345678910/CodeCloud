import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getErrorStats, resolveError, ignoreError, getErrorDetails } from "../services/error-tracking";

const router: IRouter = Router();

router.get("/projects/:id/errors", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    res.json(getErrorStats(projectId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/errors/:fingerprint", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const fingerprint = Array.isArray(req.params.fingerprint) ? req.params.fingerprint[0] : req.params.fingerprint;
  try {
    const details = getErrorDetails(projectId, fingerprint);
    if (!details) { res.status(404).json({ error: "Error group not found" }); return; }
    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/errors/:fingerprint/resolve", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const fingerprint = Array.isArray(req.params.fingerprint) ? req.params.fingerprint[0] : req.params.fingerprint;
  try {
    res.json(resolveError(fingerprint));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/errors/:fingerprint/ignore", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const fingerprint = Array.isArray(req.params.fingerprint) ? req.params.fingerprint[0] : req.params.fingerprint;
  try {
    res.json(ignoreError(fingerprint));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
