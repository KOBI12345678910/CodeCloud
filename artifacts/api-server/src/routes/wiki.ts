import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { wikiPagesTable, wikiPageVersionsTable } from "@workspace/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/projects/:id/wiki", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const q = req.query.q as string;
  try {
    const conds = [eq(wikiPagesTable.projectId, projectId)];
    if (q) conds.push(ilike(wikiPagesTable.title, `%${q}%`));
    res.json(await db.select().from(wikiPagesTable).where(and(...conds)).orderBy(wikiPagesTable.sortOrder));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/wiki", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as AuthenticatedRequest).userId;
  const { title, content, slug, parentId, isPublic, sortOrder } = req.body;
  if (!title || !slug) { res.status(400).json({ error: "title and slug are required" }); return; }
  try {
    const [page] = await db.insert(wikiPagesTable).values({ projectId, title, content: content || "", slug, parentId, isPublic, sortOrder, createdBy: userId }).returning();
    await db.insert(wikiPageVersionsTable).values({ pageId: page.id, title, content: content || "", version: 1, editedBy: userId });
    res.status(201).json(page);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/wiki/:pageId", requireAuth, async (req, res): Promise<void> => {
  const pageId = Array.isArray(req.params.pageId) ? req.params.pageId[0] : req.params.pageId;
  try {
    const [page] = await db.select().from(wikiPagesTable).where(eq(wikiPagesTable.id, pageId));
    if (!page) { res.status(404).json({ error: "Page not found" }); return; }
    res.json(page);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/wiki/:pageId", requireAuth, async (req, res): Promise<void> => {
  const pageId = Array.isArray(req.params.pageId) ? req.params.pageId[0] : req.params.pageId;
  const userId = (req as AuthenticatedRequest).userId;
  const { title, content, isPublic, sortOrder } = req.body;
  try {
    const [existing] = await db.select().from(wikiPagesTable).where(eq(wikiPagesTable.id, pageId));
    if (!existing) { res.status(404).json({ error: "Page not found" }); return; }
    const newVersion = existing.version + 1;
    const [updated] = await db.update(wikiPagesTable).set({ title: title ?? existing.title, content: content ?? existing.content, isPublic: isPublic ?? existing.isPublic, sortOrder: sortOrder ?? existing.sortOrder, version: newVersion, updatedBy: userId, updatedAt: new Date() }).where(eq(wikiPagesTable.id, pageId)).returning();
    await db.insert(wikiPageVersionsTable).values({ pageId, title: updated.title, content: updated.content, version: newVersion, editedBy: userId });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/wiki/:pageId", requireAuth, async (req, res): Promise<void> => {
  const pageId = Array.isArray(req.params.pageId) ? req.params.pageId[0] : req.params.pageId;
  try { await db.delete(wikiPagesTable).where(eq(wikiPagesTable.id, pageId)); res.sendStatus(204); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/wiki/:pageId/versions", requireAuth, async (req, res): Promise<void> => {
  const pageId = Array.isArray(req.params.pageId) ? req.params.pageId[0] : req.params.pageId;
  try { res.json(await db.select().from(wikiPageVersionsTable).where(eq(wikiPageVersionsTable.pageId, pageId)).orderBy(desc(wikiPageVersionsTable.version))); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
