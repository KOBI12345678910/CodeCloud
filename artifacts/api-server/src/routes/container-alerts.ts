import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getContainerAlerts, getAlertThresholds, updateAlertThresholds, acknowledgeAlert, snoozeAlert } from "../services/container-alerts";

const router: IRouter = Router();

router.get("/projects/:id/container-alerts", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getContainerAlerts(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/container-alerts/thresholds", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getAlertThresholds(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/projects/:id/container-alerts/thresholds", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(updateAlertThresholds(projectId, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/container-alerts/:alertId/acknowledge", requireAuth, async (req, res): Promise<void> => {
  const alertId = Array.isArray(req.params.alertId) ? req.params.alertId[0] : req.params.alertId;
  try { res.json(acknowledgeAlert(alertId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/container-alerts/:alertId/snooze", requireAuth, async (req, res): Promise<void> => {
  const alertId = Array.isArray(req.params.alertId) ? req.params.alertId[0] : req.params.alertId;
  try { res.json(snoozeAlert(alertId, req.body.minutes || 60)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
