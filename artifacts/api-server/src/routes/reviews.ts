import { Router, type IRouter } from "express";
import { db, codeReviewsTable, reviewCommentsTable, usersTable, filesTable } from "@workspace/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";

const router: IRouter = Router();

router.get("/projects/:projectId/reviews", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const status = req.query["status"] as string | undefined;

  const conditions = [eq(codeReviewsTable.projectId, projectId)];
  if (status && ["pending", "in_review", "approved", "changes_requested", "dismissed"].includes(status)) {
    conditions.push(eq(codeReviewsTable.status, status as any));
  }

  const reviews = await db.select({
    id: codeReviewsTable.id,
    projectId: codeReviewsTable.projectId,
    requesterId: codeReviewsTable.requesterId,
    reviewerId: codeReviewsTable.reviewerId,
    title: codeReviewsTable.title,
    description: codeReviewsTable.description,
    status: codeReviewsTable.status,
    branch: codeReviewsTable.branch,
    commitHash: codeReviewsTable.commitHash,
    resolvedAt: codeReviewsTable.resolvedAt,
    createdAt: codeReviewsTable.createdAt,
    updatedAt: codeReviewsTable.updatedAt,
    requesterName: sql<string | null>`r.display_name`,
    reviewerName: sql<string | null>`rv.display_name`,
  })
    .from(codeReviewsTable)
    .leftJoin(sql`${usersTable} as r`, sql`r.id = ${codeReviewsTable.requesterId}`)
    .leftJoin(sql`${usersTable} as rv`, sql`rv.id = ${codeReviewsTable.reviewerId}`)
    .where(and(...conditions))
    .orderBy(desc(codeReviewsTable.createdAt));

  res.json({ reviews });
});

router.post("/projects/:projectId/reviews", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const { userId } = req as AuthenticatedRequest;

  const { reviewerId, title, description, branch, commitHash } = req.body;
  if (!reviewerId || !title) {
    res.status(400).json({ error: "reviewerId and title are required" });
    return;
  }

  const [review] = await db.insert(codeReviewsTable).values({
    projectId,
    requesterId: userId,
    reviewerId,
    title,
    description: description || null,
    branch: branch || null,
    commitHash: commitHash || null,
  }).returning();

  logAudit({
    userId,
    action: "review.request",
    resourceType: "review",
    resourceId: review.id,
    metadata: { title, reviewerId, projectId },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.status(201).json(review);
});

router.get("/projects/:projectId/reviews/:reviewId", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const reviewId = req.params["reviewId"] as string;

  const [review] = await db.select().from(codeReviewsTable).where(eq(codeReviewsTable.id, reviewId));
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const comments = await db.select({
    id: reviewCommentsTable.id,
    reviewId: reviewCommentsTable.reviewId,
    userId: reviewCommentsTable.userId,
    fileId: reviewCommentsTable.fileId,
    filePath: reviewCommentsTable.filePath,
    lineNumber: reviewCommentsTable.lineNumber,
    lineEndNumber: reviewCommentsTable.lineEndNumber,
    content: reviewCommentsTable.content,
    resolved: reviewCommentsTable.resolved,
    parentId: reviewCommentsTable.parentId,
    createdAt: reviewCommentsTable.createdAt,
    updatedAt: reviewCommentsTable.updatedAt,
    userName: usersTable.displayName,
  })
    .from(reviewCommentsTable)
    .leftJoin(usersTable, eq(reviewCommentsTable.userId, usersTable.id))
    .where(eq(reviewCommentsTable.reviewId, reviewId))
    .orderBy(reviewCommentsTable.createdAt);

  const [commentCount] = await db.select({ count: count() })
    .from(reviewCommentsTable)
    .where(eq(reviewCommentsTable.reviewId, reviewId));

  res.json({ review, comments, commentCount: commentCount?.count ?? 0 });
});

router.patch("/projects/:projectId/reviews/:reviewId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const reviewId = req.params["reviewId"] as string;
  const { userId } = req as AuthenticatedRequest;
  const { status } = req.body;

  if (!status || !["pending", "in_review", "approved", "changes_requested", "dismissed"].includes(status)) {
    res.status(400).json({ error: "Valid status is required" });
    return;
  }

  const [review] = await db.select().from(codeReviewsTable).where(eq(codeReviewsTable.id, reviewId));
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  if (status === "approved" || status === "changes_requested") {
    if (review.reviewerId !== userId) {
      res.status(403).json({ error: "Only the assigned reviewer can approve or request changes" });
      return;
    }
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "approved" || status === "dismissed") {
    updateData["resolvedAt"] = new Date();
  }

  const [updated] = await db.update(codeReviewsTable)
    .set(updateData)
    .where(eq(codeReviewsTable.id, reviewId))
    .returning();

  logAudit({
    userId,
    action: "review.status_change",
    resourceType: "review",
    resourceId: reviewId,
    metadata: { status, previousStatus: review.status },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json(updated);
});

router.post("/projects/:projectId/reviews/:reviewId/comments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const reviewId = req.params["reviewId"] as string;
  const { userId } = req as AuthenticatedRequest;

  const { fileId, filePath, lineNumber, lineEndNumber, content, parentId } = req.body;
  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [review] = await db.select().from(codeReviewsTable).where(eq(codeReviewsTable.id, reviewId));
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  if (review.status === "pending") {
    await db.update(codeReviewsTable)
      .set({ status: "in_review" })
      .where(eq(codeReviewsTable.id, reviewId));
  }

  const [comment] = await db.insert(reviewCommentsTable).values({
    reviewId,
    userId,
    fileId: fileId || null,
    filePath: filePath || null,
    lineNumber: lineNumber || null,
    lineEndNumber: lineEndNumber || null,
    content,
    parentId: parentId || null,
  }).returning();

  const [withUser] = await db.select({
    id: reviewCommentsTable.id,
    reviewId: reviewCommentsTable.reviewId,
    userId: reviewCommentsTable.userId,
    fileId: reviewCommentsTable.fileId,
    filePath: reviewCommentsTable.filePath,
    lineNumber: reviewCommentsTable.lineNumber,
    lineEndNumber: reviewCommentsTable.lineEndNumber,
    content: reviewCommentsTable.content,
    resolved: reviewCommentsTable.resolved,
    parentId: reviewCommentsTable.parentId,
    createdAt: reviewCommentsTable.createdAt,
    updatedAt: reviewCommentsTable.updatedAt,
    userName: usersTable.displayName,
  })
    .from(reviewCommentsTable)
    .leftJoin(usersTable, eq(reviewCommentsTable.userId, usersTable.id))
    .where(eq(reviewCommentsTable.id, comment.id));

  res.status(201).json(withUser);
});

router.patch("/projects/:projectId/reviews/:reviewId/comments/:commentId/resolve", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const commentId = req.params["commentId"] as string;
  const resolved = req.body.resolved === true || req.body.resolved === "true" ? "true" : "false";

  const [updated] = await db.update(reviewCommentsTable)
    .set({ resolved })
    .where(eq(reviewCommentsTable.id, commentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  res.json(updated);
});

router.delete("/projects/:projectId/reviews/:reviewId/comments/:commentId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const commentId = req.params["commentId"] as string;
  const { userId } = req as AuthenticatedRequest;

  const [comment] = await db.select().from(reviewCommentsTable).where(eq(reviewCommentsTable.id, commentId));
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.userId !== userId) {
    res.status(403).json({ error: "Can only delete your own comments" });
    return;
  }

  await db.delete(reviewCommentsTable).where(eq(reviewCommentsTable.id, commentId));
  res.sendStatus(204);
});

export default router;
