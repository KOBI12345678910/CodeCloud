import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { listTenants, provisionTenant } from "../services/multi-tenant";

const router: IRouter = Router();

router.get("/admin/tenants", requireAuth, async (_req, res): Promise<void> => {
  try { res.json(listTenants()); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/tenants", requireAuth, async (req, res): Promise<void> => {
  const { name, plan } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  try { res.status(201).json(provisionTenant(name, plan || "free")); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
