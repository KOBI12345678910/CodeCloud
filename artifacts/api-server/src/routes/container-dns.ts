import { Router, type IRouter } from "express";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import { getDnsConfig, addDnsRecord } from "../services/container-dns";

const router: IRouter = Router();

router.get("/projects/:id/dns", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(getDnsConfig(projectId)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/dns", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.status(201).json(addDnsRecord(projectId, req.body)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
