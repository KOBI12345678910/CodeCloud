import { Router, type IRouter } from "express";
import { db, collaboratorsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListCollaboratorsParams,
  ListCollaboratorsResponse,
  AddCollaboratorParams,
  AddCollaboratorBody,
  RemoveCollaboratorParams,
} from "@workspace/api-zod";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/projects/:id/collaborators", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  const params = ListCollaboratorsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const collabs = await db.select({
    id: collaboratorsTable.id,
    projectId: collaboratorsTable.projectId,
    userId: collaboratorsTable.userId,
    role: collaboratorsTable.role,
    username: usersTable.username,
    avatarUrl: usersTable.avatarUrl,
    createdAt: collaboratorsTable.createdAt,
  })
    .from(collaboratorsTable)
    .leftJoin(usersTable, eq(collaboratorsTable.userId, usersTable.id))
    .where(eq(collaboratorsTable.projectId, params.data.id));

  res.json(ListCollaboratorsResponse.parse(collabs));
});

router.post("/projects/:id/collaborators", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  const params = AddCollaboratorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddCollaboratorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [collab] = await db.insert(collaboratorsTable).values({
    projectId: params.data.id,
    userId: user.id,
    role: parsed.data.role ?? "editor",
    invitedBy: (req as AuthenticatedRequest).userId,
  }).returning();

  res.status(201).json({
    ...collab,
    username: user.username,
    avatarUrl: user.avatarUrl,
  });
});

router.delete("/projects/:projectId/collaborators/:userId", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  const params = RemoveCollaboratorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(collaboratorsTable)
    .where(and(
      eq(collaboratorsTable.projectId, params.data.projectId),
      eq(collaboratorsTable.userId, params.data.userId),
    ))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Collaborator not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
