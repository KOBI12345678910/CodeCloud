import { Router, type IRouter } from "express";
import { db, agentTasksTable, agentEventsTable, agentCheckpointsTable, projectsTable, collaboratorsTable, aiConversationsTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { createTask, runTask, cancelTask, listTaskEvents, type AgentMode, type AgentTier } from "../services/agent/runner";
import { createCheckpoint, rollbackToCheckpoint, diffSnapshots, type SnapshotEntry } from "../services/agent/checkpoints";

const router: IRouter = Router();

async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return false;
  if (project.ownerId === userId || project.isPublic) return true;
  const [collab] = await db.select().from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.projectId, projectId), eq(collaboratorsTable.userId, userId)));
  return !!collab;
}

router.post("/agent/tasks", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, prompt, mode, tier, conversationId } = req.body ?? {};
  if (!projectId || !prompt) { res.status(400).json({ error: "projectId and prompt required" }); return; }
  if (!(await checkProjectAccess(projectId, userId))) { res.status(403).json({ error: "Access denied" }); return; }
  const m = (["plan", "build", "background"].includes(mode) ? mode : "build") as AgentMode;
  const t = (["standard", "power", "max"].includes(tier) ? tier : "standard") as AgentTier;
  try {
    const created = await createTask({ projectId, userId, conversationId: conversationId ?? null, prompt: String(prompt), mode: m, tier: t });
    setImmediate(() => { runTask(created.taskId).catch(() => {}); });
    res.status(201).json(created);
  } catch (err) {
    const e = err as { code?: string; message?: string; balance?: number };
    const code = e.code;
    const message = e.message ?? "Failed to create task";
    if (code === "no_credits") { res.status(402).json({ error: message, code, balanceUsd: (e.balance ?? 0) / 1_000_000 }); return; }
    if (code === "concurrency_limit" || code === "model_not_allowed") { res.status(403).json({ error: message, code }); return; }
    res.status(400).json({ error: message });
  }
});

router.get("/agent/tasks", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const projectId = req.query.projectId as string | undefined;
  const conversationId = req.query.conversationId as string | undefined;
  const conditions = [eq(agentTasksTable.userId, userId)];
  if (projectId) conditions.push(eq(agentTasksTable.projectId, projectId));
  if (conversationId) conditions.push(eq(agentTasksTable.conversationId, conversationId));
  const rows = await db.select().from(agentTasksTable).where(and(...conditions))
    .orderBy(desc(agentTasksTable.createdAt)).limit(100);
  res.json(rows);
});

router.get("/agent/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, id), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const sinceSeq = req.query.sinceSeq ? Number(req.query.sinceSeq) : 0;
  const events = await listTaskEvents(id, sinceSeq);
  const checkpoints = await db.select({
    id: agentCheckpointsTable.id, label: agentCheckpointsTable.label,
    fileCount: agentCheckpointsTable.fileCount, isFinal: agentCheckpointsTable.isFinal,
    createdAt: agentCheckpointsTable.createdAt,
  }).from(agentCheckpointsTable).where(eq(agentCheckpointsTable.taskId, id))
    .orderBy(asc(agentCheckpointsTable.createdAt));
  res.json({ task, events, checkpoints });
});

router.post("/agent/tasks/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, id), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  cancelTask(id);
  res.json({ ok: true });
});

router.post("/agent/tasks/:id/approve", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, id), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  if (task.state !== "awaiting_approval") { res.status(400).json({ error: "Task is not awaiting approval" }); return; }
  await db.update(agentTasksTable).set({ mode: "build", state: "queued" }).where(eq(agentTasksTable.id, id));
  setImmediate(() => { runTask(id, { approved: true }).catch(() => {}); });
  res.json({ ok: true });
});

router.post("/agent/tasks/:id/retry", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, id), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(agentTasksTable).set({ state: "queued", errorMessage: null }).where(eq(agentTasksTable.id, id));
  setImmediate(() => { runTask(id).catch(() => {}); });
  res.json({ ok: true });
});

router.get("/agent/tasks/:id/checkpoints", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, id), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  const rows = await db.select({
    id: agentCheckpointsTable.id, label: agentCheckpointsTable.label,
    fileCount: agentCheckpointsTable.fileCount, isFinal: agentCheckpointsTable.isFinal,
    createdAt: agentCheckpointsTable.createdAt,
  }).from(agentCheckpointsTable).where(eq(agentCheckpointsTable.taskId, id))
    .orderBy(asc(agentCheckpointsTable.createdAt));
  res.json(rows);
});

router.post("/agent/checkpoints/manual", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const { taskId, label } = req.body ?? {};
  const [task] = await db.select().from(agentTasksTable).where(and(eq(agentTasksTable.id, String(taskId)), eq(agentTasksTable.userId, userId)));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  const cpId = await createCheckpoint(task.id, task.projectId, String(label || "Manual checkpoint"));
  res.status(201).json({ id: cpId });
});

router.get("/agent/checkpoints/:id/diff", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const otherId = req.query.against as string | undefined;
  const [cp] = await db.select().from(agentCheckpointsTable).where(eq(agentCheckpointsTable.id, id));
  if (!cp) { res.status(404).json({ error: "Not found" }); return; }
  const [task] = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, cp.taskId));
  if (!task || task.userId !== userId) { res.status(403).json({ error: "Access denied" }); return; }
  let other: SnapshotEntry[] = [];
  if (otherId) {
    const [otherCp] = await db.select().from(agentCheckpointsTable).where(eq(agentCheckpointsTable.id, otherId));
    if (otherCp) other = (otherCp.fileSnapshot as SnapshotEntry[]) ?? [];
  }
  const target = (cp.fileSnapshot as SnapshotEntry[]) ?? [];
  res.json({ diff: diffSnapshots(other, target), checkpoint: { id: cp.id, label: cp.label, createdAt: cp.createdAt } });
});

router.post("/agent/checkpoints/:id/rollback", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const id = String(req.params.id);
  const [cp] = await db.select().from(agentCheckpointsTable).where(eq(agentCheckpointsTable.id, id));
  if (!cp) { res.status(404).json({ error: "Not found" }); return; }
  const [task] = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, cp.taskId));
  if (!task || task.userId !== userId) { res.status(403).json({ error: "Access denied" }); return; }
  const out = await rollbackToCheckpoint(id);
  await db.insert(agentEventsTable).values({
    taskId: cp.taskId,
    seq: ((await db.select({ seq: agentEventsTable.seq }).from(agentEventsTable).where(eq(agentEventsTable.taskId, cp.taskId)).orderBy(desc(agentEventsTable.seq)).limit(1))[0]?.seq ?? 0) + 1,
    type: "rollback",
    payload: { checkpointId: id, label: cp.label, restored: out.restored },
  });
  res.json({ ok: true, restored: out.restored });
});

router.get("/agent/cost", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const conversationId = req.query.conversationId as string | undefined;
  const conditions = [eq(agentTasksTable.userId, userId)];
  if (conversationId) conditions.push(eq(agentTasksTable.conversationId, conversationId));
  const rows = await db.select().from(agentTasksTable).where(and(...conditions));
  const total = rows.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  const inTokens = rows.reduce((sum, r) => sum + r.inputTokens, 0);
  const outTokens = rows.reduce((sum, r) => sum + r.outputTokens, 0);
  res.json({ totalUsd: total, inputTokens: inTokens, outputTokens: outTokens, taskCount: rows.length });
});

router.get("/agent/conversations/:id/versions", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const cid = String(req.params.id);
  const [conv] = await db.select().from(aiConversationsTable).where(and(eq(aiConversationsTable.id, cid), eq(aiConversationsTable.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const sibling = await db.select().from(aiConversationsTable).where(and(
    eq(aiConversationsTable.userId, userId),
    eq(aiConversationsTable.projectId, conv.projectId!),
  )).orderBy(asc(aiConversationsTable.createdAt));
  res.json(sibling.map((c, i) => ({ id: c.id, label: `Agent ${i + 1}`, title: c.title, isActive: c.id === cid, createdAt: c.createdAt })));
});

export default router;
