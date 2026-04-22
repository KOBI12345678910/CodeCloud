import { Router, type IRouter } from "express";
import { db, commentsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/projects/:id/comments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const fileId = req.query.fileId as string | undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const conditions = [eq(commentsTable.projectId, projectId)];
  if (fileId) conditions.push(eq(commentsTable.fileId, fileId));

  const items = await db.select({
    id: commentsTable.id,
    projectId: commentsTable.projectId,
    fileId: commentsTable.fileId,
    userId: commentsTable.userId,
    content: commentsTable.content,
    lineNumber: commentsTable.lineNumber,
    parentId: commentsTable.parentId,
    createdAt: commentsTable.createdAt,
    updatedAt: commentsTable.updatedAt,
    username: usersTable.username,
    avatarUrl: usersTable.avatarUrl,
  })
    .from(commentsTable)
    .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(commentsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(items);
});

router.post("/projects/:id/comments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { fileId, content, lineNumber, parentId } = req.body;

  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [comment] = await db.insert(commentsTable).values({
    projectId,
    fileId: fileId || null,
    userId,
    content,
    lineNumber: lineNumber ?? null,
    parentId: parentId || null,
  }).returning();

  res.status(201).json(comment);
});

router.delete("/projects/:projectId/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;

  const [deleted] = await db.delete(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
