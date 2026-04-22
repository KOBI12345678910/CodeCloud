import { Router, type IRouter } from "express";
import { db, aiConversationsTable, aiMessagesTable, agentTasksTable } from "@workspace/db";
import { eq, and, desc, asc, lt, gt, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { getTaskUsageSummary } from "../services/credits/usage-recorder";

const router: IRouter = Router();

router.get("/agent/conversations", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = req.query.projectId as string | undefined;
  const conditions = [eq(aiConversationsTable.userId, userId)];
  if (projectId) conditions.push(eq(aiConversationsTable.projectId, projectId));
  const rows = await db.select().from(aiConversationsTable).where(and(...conditions))
    .orderBy(desc(aiConversationsTable.updatedAt)).limit(50);
  res.json(rows);
});

router.get("/agent/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const cid = String(req.params.id);
  const [conv] = await db.select().from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, cid), eq(aiConversationsTable.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));
  const direction = (req.query.direction as string) === "after" ? "after" : "before";
  const cursor = req.query.cursor as string | undefined;

  const conditions: ReturnType<typeof eq>[] = [eq(aiMessagesTable.conversationId, cid)];
  if (cursor) {
    if (direction === "before") conditions.push(lt(aiMessagesTable.createdAt, sql`(SELECT created_at FROM ai_messages WHERE id = ${cursor})`));
    else conditions.push(gt(aiMessagesTable.createdAt, sql`(SELECT created_at FROM ai_messages WHERE id = ${cursor})`));
  }
  const rows = await db.select().from(aiMessagesTable).where(and(...conditions))
    .orderBy(direction === "before" ? desc(aiMessagesTable.createdAt) : asc(aiMessagesTable.createdAt))
    .limit(limit);
  const ordered = direction === "before" ? rows.slice().reverse() : rows;
  const taskIds = ordered.map((m: { toolCalls?: unknown }) => (m.toolCalls as { taskId?: string } | null)?.taskId).filter((x): x is string => typeof x === "string");
  const tasks = taskIds.length
    ? await db.select().from(agentTasksTable).where(inArray(agentTasksTable.id, taskIds))
    : [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  res.json({
    conversation: { id: conv.id, title: conv.title, createdAt: conv.createdAt },
    messages: ordered.map((m) => {
      const meta = (m.toolCalls as { taskId?: string } | null) ?? {};
      const t = meta.taskId ? taskMap.get(meta.taskId) : null;
      return {
        id: m.id, role: m.role, content: m.content, createdAt: m.createdAt,
        task: t ? { id: t.id, state: t.state, costUsd: t.costUsd, model: t.model } : null,
      };
    }),
    nextCursor: rows.length === limit ? (direction === "before" ? rows[rows.length - 1].id : rows[rows.length - 1].id) : null,
    direction,
  });
});

router.get("/agent/tasks/:id/usage", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, id), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  const summary = await getTaskUsageSummary(id);
  res.json({
    taskId: id, totalCostMicroUsd: summary.totalCostMicroUsd,
    totalCostUsd: summary.totalCostMicroUsd / 1_000_000,
    totalInputTokens: summary.totalInputTokens, totalOutputTokens: summary.totalOutputTokens,
    rows: summary.rows.map((r) => ({
      id: r.id, stepIndex: r.stepIndex, kind: r.kind, model: r.model, endpoint: r.endpoint,
      inputTokens: r.inputTokens, outputTokens: r.outputTokens, cachedInputTokens: r.cachedInputTokens,
      computeMs: r.computeMs, costMicroUsd: Number(r.costMicroUsd), costUsd: Number(r.costMicroUsd) / 1_000_000,
      pricingVersion: r.pricingVersion, createdAt: r.createdAt,
    })),
  });
});

router.get("/agent/tasks-search", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const conditions = [eq(agentTasksTable.userId, userId)];
  const status = req.query.status as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  const model = req.query.model as string | undefined;
  const q = (req.query.q as string | undefined)?.trim();
  if (status && ["queued", "active", "awaiting_approval", "completed", "failed", "cancelled"].includes(status)) {
    conditions.push(eq(agentTasksTable.state, status as typeof agentTasksTable.$inferSelect.state));
  }
  if (projectId) conditions.push(eq(agentTasksTable.projectId, projectId));
  if (model) conditions.push(eq(agentTasksTable.model, model));
  if (q) conditions.push(sql`${agentTasksTable.prompt} ILIKE ${"%" + q + "%"}`);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
  const rows = await db.select().from(agentTasksTable).where(and(...conditions))
    .orderBy(desc(agentTasksTable.createdAt)).limit(limit);
  res.json(rows);
});

export default router;
