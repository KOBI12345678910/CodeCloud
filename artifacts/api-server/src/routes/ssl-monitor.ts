import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getCertificates, getCertificate, renewCertificate, toggleAutoRenew } from "../services/ssl-monitor";

const router: IRouter = Router();

router.get("/ssl/certificates", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(getCertificates()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/ssl/certificates/:id", requireAuth, async (req, res): Promise<void> => {
  const cert = getCertificate(req.params.id as string);
  if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }
  res.json(cert);
});

router.post("/ssl/certificates/:id/renew", requireAuth, async (req, res): Promise<void> => {
  const result = renewCertificate(req.params.id as string);
  if (!result) { res.status(404).json({ error: "Certificate not found" }); return; }
  res.json(result);
});

router.patch("/ssl/certificates/:id/auto-renew", requireAuth, async (req, res): Promise<void> => {
  const result = toggleAutoRenew(req.params.id as string);
  if (!result) { res.status(404).json({ error: "Certificate not found" }); return; }
  res.json(result);
});

export default router;
