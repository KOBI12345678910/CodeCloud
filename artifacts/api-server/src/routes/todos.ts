import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { todosTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/projects/:id/todos", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try { res.json(await db.select().from(todosTable).where(eq(todosTable.projectId, projectId)).orderBy(desc(todosTable.createdAt))); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/projects/:id/todos", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = (req as AuthenticatedRequest).userId;
  const { title, description, priority, assignedTo, dueDate, sourceFile, sourceLine } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  try {
    const [todo] = await db.insert(todosTable).values({ projectId, createdBy: userId, title, description, priority, assignedTo, dueDate: dueDate ? new Date(dueDate) : undefined, sourceFile, sourceLine }).returning();
    res.status(201).json(todo);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/todos/:todoId", requireAuth, async (req, res): Promise<void> => {
  const todoId = Array.isArray(req.params.todoId) ? req.params.todoId[0] : req.params.todoId;
  const { title, description, priority, assignedTo, dueDate, completed, status } = req.body;
  try {
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updates.status = status;
    if (completed !== undefined) { updates.completed = completed; updates.completedAt = completed ? new Date() : null; }
    const [updated] = await db.update(todosTable).set(updates).where(eq(todosTable.id, todoId)).returning();
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/todos/:todoId", requireAuth, async (req, res): Promise<void> => {
  const todoId = Array.isArray(req.params.todoId) ? req.params.todoId[0] : req.params.todoId;
  try { await db.delete(todosTable).where(eq(todosTable.id, todoId)); res.sendStatus(204); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
