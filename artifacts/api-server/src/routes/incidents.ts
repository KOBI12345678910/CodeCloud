import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { incidentsTable, incidentUpdatesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/incidents", requireAuth, async (req, res): Promise<void> => {
  try { res.json(await db.select().from(incidentsTable).orderBy(desc(incidentsTable.createdAt)).limit(50)); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/incidents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { title, description, severity, affectedServices } = req.body;
  if (!title || !description) { res.status(400).json({ error: "title and description required" }); return; }
  try {
    const [incident] = await db.insert(incidentsTable).values({ title, description, severity: severity || "minor", affectedServices, createdBy: userId }).returning();
    await db.insert(incidentUpdatesTable).values({ incidentId: incident.id, message: "Incident created: " + title, status: "investigating", createdBy: userId });
    res.status(201).json(incident);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/incidents/:incidentId", requireAuth, async (req, res): Promise<void> => {
  const incidentId = Array.isArray(req.params.incidentId) ? req.params.incidentId[0] : req.params.incidentId;
  try {
    const [incident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incidentId));
    if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }
    const updates = await db.select().from(incidentUpdatesTable).where(eq(incidentUpdatesTable.incidentId, incidentId)).orderBy(desc(incidentUpdatesTable.createdAt));
    res.json({ ...incident, updates });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/incidents/:incidentId/updates", requireAuth, async (req, res): Promise<void> => {
  const incidentId = Array.isArray(req.params.incidentId) ? req.params.incidentId[0] : req.params.incidentId;
  const userId = (req as AuthenticatedRequest).userId;
  const { message, status } = req.body;
  if (!message || !status) { res.status(400).json({ error: "message and status required" }); return; }
  try {
    const [update] = await db.insert(incidentUpdatesTable).values({ incidentId, message, status, createdBy: userId }).returning();
    await db.update(incidentsTable).set({ status, updatedAt: new Date(), ...(status === "resolved" ? { resolvedAt: new Date() } : {}) }).where(eq(incidentsTable.id, incidentId));
    res.status(201).json(update);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
