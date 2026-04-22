import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const items = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [unreadResult] = await db.select({ count: count() }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

  res.json({ items, unreadCount: unreadResult?.count ?? 0 });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const notifId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.userId, userId)));

  res.json({ success: true });
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ success: true });
});

export default router;
