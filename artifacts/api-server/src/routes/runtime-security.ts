import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getSeccompProfiles, getAppArmorPolicies, getSecurityFlags, getAuditResults, activateSeccomp, setAppArmorMode, toggleFlag } from "../services/runtime-security";

const router: IRouter = Router();

router.get("/projects/:projectId/runtime-security/seccomp", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getSeccompProfiles(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:projectId/runtime-security/apparmor", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getAppArmorPolicies(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:projectId/runtime-security/flags", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getSecurityFlags(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:projectId/runtime-security/audit", requireAuth, async (req, res): Promise<void> => {
  try { res.json(getAuditResults(req.params.projectId as string)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:projectId/runtime-security/seccomp/:id/activate", requireAuth, async (req, res): Promise<void> => {
  const result = activateSeccomp(req.params.projectId as string, req.params.id as string);
  if (!result) { res.status(404).json({ error: "Profile not found" }); return; }
  res.json(result);
});

router.post("/projects/:projectId/runtime-security/apparmor/:id/mode", requireAuth, async (req, res): Promise<void> => {
  const result = setAppArmorMode(req.params.projectId as string, req.params.id as string, req.body.mode);
  if (!result) { res.status(404).json({ error: "Policy not found" }); return; }
  res.json(result);
});

router.post("/projects/:projectId/runtime-security/flags/:flagId/toggle", requireAuth, async (req, res): Promise<void> => {
  const result = toggleFlag(req.params.projectId as string, req.params.flagId as string);
  if (!result) { res.status(404).json({ error: "Flag not found" }); return; }
  res.json(result);
});

export default router;
