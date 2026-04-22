import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requestCertificate,
  verifyDns,
  renewCertificate,
  revokeCertificate,
  deleteCertificate,
  getCertificatesForProject,
  getCertificate,
  updateForceHttps,
  updateAutoRenew,
} from "../services/ssl";

const router = Router();

router.get("/api/projects/:projectId/ssl", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const certs = await getCertificatesForProject(projectId);
  res.json(certs);
});

router.get("/api/ssl/:certId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  const cert = await getCertificate(certId);
  if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }
  res.json(cert);
});

router.post("/api/projects/:projectId/ssl", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const { domain, forceHttps } = req.body;
  if (!domain || typeof domain !== "string") {
    res.status(400).json({ error: "domain is required" }); return;
  }
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    res.status(400).json({ error: "Invalid domain format" }); return;
  }
  try {
    const cert = await requestCertificate(projectId, domain.toLowerCase(), forceHttps !== false);
    res.status(201).json(cert);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

router.post("/api/ssl/:certId/verify-dns", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  try {
    const cert = await verifyDns(certId);
    res.json(cert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/api/ssl/:certId/renew", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  try {
    const cert = await renewCertificate(certId);
    res.json(cert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/api/ssl/:certId/revoke", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  try {
    const cert = await revokeCertificate(certId);
    res.json(cert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/api/ssl/:certId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  try {
    await deleteCertificate(certId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/api/ssl/:certId/force-https", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  const { forceHttps } = req.body;
  if (typeof forceHttps !== "boolean") {
    res.status(400).json({ error: "forceHttps must be a boolean" }); return;
  }
  try {
    const cert = await updateForceHttps(certId, forceHttps);
    res.json(cert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/api/ssl/:certId/auto-renew", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const certId = req.params.certId as string;
  const { autoRenew } = req.body;
  if (typeof autoRenew !== "boolean") {
    res.status(400).json({ error: "autoRenew must be a boolean" }); return;
  }
  try {
    const cert = await updateAutoRenew(certId, autoRenew);
    res.json(cert);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
