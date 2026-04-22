import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { milestonesTable, milestoneTasks, todosTable } from "@workspace/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/projects/:id/milestones", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const status = req.query.status as string | undefined;
  const sort = req.query.sort as string || "due_date";

  try {
    const conditions = [eq(milestonesTable.projectId, projectId)];
    if (status === "open" || status === "closed") {
      conditions.push(eq(milestonesTable.status, status));
    }

    const orderBy = sort === "created" ? desc(milestonesTable.createdAt) : asc(milestonesTable.dueDate);

    const milestones = await db.select().from(milestonesTable)
      .where(and(...conditions))
      .orderBy(orderBy);

    const result = await Promise.all(milestones.map(async (m) => {
      const tasks = await db.select({
        id: todosTable.id,
        title: todosTable.title,
        completed: todosTable.completed,
        status: todosTable.status,
        priority: todosTable.priority,
      })
        .from(milestoneTasks)
        .innerJoin(todosTable, eq(milestoneTasks.todoId, todosTable.id))
        .where(eq(milestoneTasks.milestoneId, m.id));

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      if (m.progress !== progress) {
        await db.update(milestonesTable).set({ progress, updatedAt: new Date() }).where(eq(milestonesTable.id, m.id));
      }

      return { ...m, progress, tasks, totalTasks, completedTasks };
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects/:id/milestones", requireAuth, requireProjectAccess("editor"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;
  const userId = (req as AuthenticatedRequest).userId;
  const { title, description, dueDate } = req.body;

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  try {
    const [milestone] = await db.insert(milestonesTable).values({
      projectId,
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: userId,
    }).returning();

    res.status(201).json({ ...milestone, tasks: [], totalTasks: 0, completedTasks: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/milestones/:milestoneId", requireAuth, async (req, res): Promise<void> => {
  const milestoneId = req.params.milestoneId as string;

  try {
    const [milestone] = await db.select().from(milestonesTable).where(eq(milestonesTable.id, milestoneId));
    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const tasks = await db.select({
      id: todosTable.id,
      title: todosTable.title,
      description: todosTable.description,
      completed: todosTable.completed,
      status: todosTable.status,
      priority: todosTable.priority,
      dueDate: todosTable.dueDate,
      assignedTo: todosTable.assignedTo,
      createdAt: todosTable.createdAt,
    })
      .from(milestoneTasks)
      .innerJoin(todosTable, eq(milestoneTasks.todoId, todosTable.id))
      .where(eq(milestoneTasks.milestoneId, milestoneId));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({ ...milestone, progress, tasks, totalTasks, completedTasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/milestones/:milestoneId", requireAuth, async (req, res): Promise<void> => {
  const milestoneId = req.params.milestoneId as string;
  const { title, description, dueDate, status } = req.body;

  try {
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(milestonesTable)
      .set(updates)
      .where(eq(milestonesTable.id, milestoneId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/milestones/:milestoneId", requireAuth, async (req, res): Promise<void> => {
  const milestoneId = req.params.milestoneId as string;

  try {
    const [deleted] = await db.delete(milestonesTable)
      .where(eq(milestonesTable.id, milestoneId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/milestones/:milestoneId/tasks", requireAuth, async (req, res): Promise<void> => {
  const milestoneId = req.params.milestoneId as string;
  const { todoId } = req.body;

  if (!todoId) {
    res.status(400).json({ error: "todoId is required" });
    return;
  }

  try {
    const [milestone] = await db.select().from(milestonesTable).where(eq(milestonesTable.id, milestoneId));
    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const existing = await db.select().from(milestoneTasks)
      .where(and(eq(milestoneTasks.milestoneId, milestoneId), eq(milestoneTasks.todoId, todoId)));

    if (existing.length > 0) {
      res.status(409).json({ error: "Task already linked to this milestone" });
      return;
    }

    const [link] = await db.insert(milestoneTasks).values({
      milestoneId,
      todoId,
    }).returning();

    const tasks = await db.select({
      id: todosTable.id,
      title: todosTable.title,
      completed: todosTable.completed,
    })
      .from(milestoneTasks)
      .innerJoin(todosTable, eq(milestoneTasks.todoId, todosTable.id))
      .where(eq(milestoneTasks.milestoneId, milestoneId));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await db.update(milestonesTable).set({ progress, updatedAt: new Date() }).where(eq(milestonesTable.id, milestoneId));

    res.status(201).json({ link, progress, totalTasks, completedTasks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/milestones/:milestoneId/tasks/:todoId", requireAuth, async (req, res): Promise<void> => {
  const milestoneId = req.params.milestoneId as string;
  const todoId = req.params.todoId as string;

  try {
    const [deleted] = await db.delete(milestoneTasks)
      .where(and(eq(milestoneTasks.milestoneId, milestoneId), eq(milestoneTasks.todoId, todoId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    const tasks = await db.select({
      id: todosTable.id,
      completed: todosTable.completed,
    })
      .from(milestoneTasks)
      .innerJoin(todosTable, eq(milestoneTasks.todoId, todosTable.id))
      .where(eq(milestoneTasks.milestoneId, milestoneId));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await db.update(milestonesTable).set({ progress, updatedAt: new Date() }).where(eq(milestonesTable.id, milestoneId));

    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id/milestones/progress", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const projectId = req.params.id as string;

  try {
    const milestones = await db.select({
      id: milestonesTable.id,
      title: milestonesTable.title,
      progress: milestonesTable.progress,
      status: milestonesTable.status,
      dueDate: milestonesTable.dueDate,
    })
      .from(milestonesTable)
      .where(eq(milestonesTable.projectId, projectId))
      .orderBy(asc(milestonesTable.dueDate));

    res.json(milestones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
