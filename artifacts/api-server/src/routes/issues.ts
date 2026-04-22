import { Router, type IRouter } from "express";
import { db, issuesTable, commentsTable, usersTable } from "@workspace/db";
import { eq, and, desc, asc, sql, type SQL } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import type { Issue } from "@workspace/db";

const router: IRouter = Router();

const VALID_STATUSES = ["open", "in-progress", "closed"] as const;
const VALID_LABELS = ["bug", "feature", "improvement"] as const;

type IssueStatus = (typeof VALID_STATUSES)[number];
type IssueLabel = (typeof VALID_LABELS)[number];

function isValidStatus(s: string): s is IssueStatus {
  return (VALID_STATUSES as readonly string[]).includes(s);
}
function isValidLabel(l: string): l is IssueLabel {
  return (VALID_LABELS as readonly string[]).includes(l);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

router.get("/projects/:id/issues", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const status = req.query.status as string | undefined;
  const label = req.query.label as string | undefined;
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as string) || "desc";
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  if (status && !isValidStatus(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  if (label && !isValidLabel(label)) {
    res.status(400).json({ error: `Invalid label. Must be one of: ${VALID_LABELS.join(", ")}` });
    return;
  }

  try {
    const conditions: SQL[] = [eq(issuesTable.projectId, projectId)];
    if (status) conditions.push(eq(issuesTable.status, status as any));
    if (label) conditions.push(eq(issuesTable.label, label as any));

    const orderCol = sortBy === "updatedAt" ? issuesTable.updatedAt : issuesTable.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const items = await db.select({
      id: issuesTable.id,
      projectId: issuesTable.projectId,
      title: issuesTable.title,
      description: issuesTable.description,
      status: issuesTable.status,
      label: issuesTable.label,
      assigneeId: issuesTable.assigneeId,
      createdBy: issuesTable.createdBy,
      codeReferences: issuesTable.codeReferences,
      createdAt: issuesTable.createdAt,
      updatedAt: issuesTable.updatedAt,
      creatorUsername: usersTable.username,
      creatorAvatar: usersTable.avatarUrl,
    })
      .from(issuesTable)
      .leftJoin(usersTable, eq(issuesTable.createdBy, usersTable.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderCol))
      .limit(limit)
      .offset(offset);

    res.json(items);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get("/projects/:id/issues/counts", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const rows = await db.select({
      status: issuesTable.status,
      count: sql<number>`count(*)::int`,
    })
      .from(issuesTable)
      .where(eq(issuesTable.projectId, projectId))
      .groupBy(issuesTable.status);

    const counts: Record<string, number> = { open: 0, "in-progress": 0, closed: 0 };
    for (const r of rows) counts[r.status] = r.count;
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json(counts);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get("/projects/:id/issues/:issueId", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = Array.isArray(req.params.issueId) ? req.params.issueId[0] : req.params.issueId;
  try {
    const [issue] = await db.select({
      id: issuesTable.id,
      projectId: issuesTable.projectId,
      title: issuesTable.title,
      description: issuesTable.description,
      status: issuesTable.status,
      label: issuesTable.label,
      assigneeId: issuesTable.assigneeId,
      createdBy: issuesTable.createdBy,
      codeReferences: issuesTable.codeReferences,
      createdAt: issuesTable.createdAt,
      updatedAt: issuesTable.updatedAt,
      creatorUsername: usersTable.username,
      creatorAvatar: usersTable.avatarUrl,
    })
      .from(issuesTable)
      .leftJoin(usersTable, eq(issuesTable.createdBy, usersTable.id))
      .where(and(eq(issuesTable.id, issueId), eq(issuesTable.projectId, projectId)));

    if (!issue) { res.status(404).json({ error: "Issue not found" }); return; }
    res.json(issue);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post("/projects/:id/issues", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { userId } = req as AuthenticatedRequest;
  const { title, description, status, label, assigneeId, codeReferences } = req.body;

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const resolvedLabel = label || "bug";
  if (!isValidLabel(resolvedLabel)) {
    res.status(400).json({ error: `Invalid label. Must be one of: ${VALID_LABELS.join(", ")}` });
    return;
  }

  const resolvedStatus = status || "open";
  if (!isValidStatus(resolvedStatus)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }

  try {
    const [issue] = await db.insert(issuesTable).values({
      projectId,
      title,
      description: description || null,
      status: resolvedStatus,
      label: resolvedLabel,
      assigneeId: assigneeId || null,
      createdBy: userId,
      codeReferences: codeReferences || null,
    }).returning();

    res.status(201).json(issue);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.patch("/projects/:id/issues/:issueId", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = Array.isArray(req.params.issueId) ? req.params.issueId[0] : req.params.issueId;
  const { title, description, status, label, assigneeId, codeReferences } = req.body;

  if (status !== undefined && !isValidStatus(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  if (label !== undefined && !isValidLabel(label)) {
    res.status(400).json({ error: `Invalid label. Must be one of: ${VALID_LABELS.join(", ")}` });
    return;
  }

  try {
    const updates: Partial<Pick<Issue, "title" | "description" | "status" | "label" | "assigneeId" | "codeReferences" | "updatedAt">> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (label !== undefined) updates.label = label;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;
    if (codeReferences !== undefined) updates.codeReferences = codeReferences;

    const [updated] = await db.update(issuesTable)
      .set(updates)
      .where(and(eq(issuesTable.id, issueId), eq(issuesTable.projectId, projectId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Issue not found" }); return; }
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.delete("/projects/:id/issues/:issueId", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = Array.isArray(req.params.issueId) ? req.params.issueId[0] : req.params.issueId;
  try {
    const [deleted] = await db.delete(issuesTable)
      .where(and(eq(issuesTable.id, issueId), eq(issuesTable.projectId, projectId)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Issue not found" }); return; }
    res.sendStatus(204);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.get("/projects/:id/issues/:issueId/comments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = Array.isArray(req.params.issueId) ? req.params.issueId[0] : req.params.issueId;

  try {
    const [issue] = await db.select({ id: issuesTable.id })
      .from(issuesTable)
      .where(and(eq(issuesTable.id, issueId), eq(issuesTable.projectId, projectId)));
    if (!issue) { res.status(404).json({ error: "Issue not found" }); return; }

    const items = await db.select({
      id: commentsTable.id,
      projectId: commentsTable.projectId,
      issueId: commentsTable.issueId,
      userId: commentsTable.userId,
      content: commentsTable.content,
      parentId: commentsTable.parentId,
      createdAt: commentsTable.createdAt,
      updatedAt: commentsTable.updatedAt,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
    })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
      .where(and(eq(commentsTable.issueId, issueId), eq(commentsTable.projectId, projectId)))
      .orderBy(asc(commentsTable.createdAt));

    res.json(items);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

router.post("/projects/:id/issues/:issueId/comments", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = Array.isArray(req.params.issueId) ? req.params.issueId[0] : req.params.issueId;
  const { content, parentId } = req.body;

  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const [issue] = await db.select({ id: issuesTable.id })
      .from(issuesTable)
      .where(and(eq(issuesTable.id, issueId), eq(issuesTable.projectId, projectId)));
    if (!issue) { res.status(404).json({ error: "Issue not found" }); return; }

    const [comment] = await db.insert(commentsTable).values({
      projectId,
      issueId,
      userId,
      content,
      parentId: parentId || null,
    }).returning();

    res.status(201).json(comment);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;
