import { Router, type IRouter } from "express";
import { db, liveSessionsTable, sessionParticipantsTable, sessionChatTable, usersTable } from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

function generateShareCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

router.post("/projects/:projectId/live-sessions", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const { userId } = req as AuthenticatedRequest;
  const { title, description, maxParticipants, allowChat, defaultRole } = req.body;

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const shareCode = generateShareCode();

  const [session] = await db.insert(liveSessionsTable).values({
    projectId,
    hostId: userId,
    title,
    description: description || null,
    shareCode,
    maxParticipants: maxParticipants || 50,
    allowChat: allowChat !== false,
    defaultRole: defaultRole || "spectator",
  }).returning();

  await db.insert(sessionParticipantsTable).values({
    sessionId: session.id,
    userId,
    role: "presenter",
  });

  res.status(201).json(session);
});

router.get("/projects/:projectId/live-sessions", requireAuth, async (req, res): Promise<void> => {
  const projectId = req.params["projectId"] as string;
  const statusFilter = req.query["status"] as string | undefined;

  const conditions = [eq(liveSessionsTable.projectId, projectId)];
  if (statusFilter && ["active", "paused", "ended"].includes(statusFilter)) {
    conditions.push(eq(liveSessionsTable.status, statusFilter as any));
  }

  const sessions = await db.select({
    id: liveSessionsTable.id,
    projectId: liveSessionsTable.projectId,
    hostId: liveSessionsTable.hostId,
    title: liveSessionsTable.title,
    description: liveSessionsTable.description,
    shareCode: liveSessionsTable.shareCode,
    status: liveSessionsTable.status,
    maxParticipants: liveSessionsTable.maxParticipants,
    allowChat: liveSessionsTable.allowChat,
    defaultRole: liveSessionsTable.defaultRole,
    activeFile: liveSessionsTable.activeFile,
    createdAt: liveSessionsTable.createdAt,
    endedAt: liveSessionsTable.endedAt,
    hostName: usersTable.displayName,
  })
    .from(liveSessionsTable)
    .leftJoin(usersTable, eq(liveSessionsTable.hostId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(liveSessionsTable.createdAt));

  res.json({ sessions });
});

router.get("/live/:shareCode", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;

  const [session] = await db.select({
    id: liveSessionsTable.id,
    projectId: liveSessionsTable.projectId,
    hostId: liveSessionsTable.hostId,
    title: liveSessionsTable.title,
    description: liveSessionsTable.description,
    shareCode: liveSessionsTable.shareCode,
    status: liveSessionsTable.status,
    maxParticipants: liveSessionsTable.maxParticipants,
    allowChat: liveSessionsTable.allowChat,
    defaultRole: liveSessionsTable.defaultRole,
    activeFile: liveSessionsTable.activeFile,
    createdAt: liveSessionsTable.createdAt,
    endedAt: liveSessionsTable.endedAt,
    hostName: usersTable.displayName,
  })
    .from(liveSessionsTable)
    .leftJoin(usersTable, eq(liveSessionsTable.hostId, usersTable.id))
    .where(eq(liveSessionsTable.shareCode, shareCode));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(session);
});

router.post("/live/:shareCode/join", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;
  const { userId } = req as AuthenticatedRequest;

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status === "ended") {
    res.status(410).json({ error: "Session has ended" });
    return;
  }

  const activeParticipants = await db.select()
    .from(sessionParticipantsTable)
    .where(and(
      eq(sessionParticipantsTable.sessionId, session.id),
      isNull(sessionParticipantsTable.leftAt)
    ));

  if (activeParticipants.length >= session.maxParticipants) {
    res.status(429).json({ error: "Session is full" });
    return;
  }

  const existing = activeParticipants.find((p) => p.userId === userId);
  if (existing) {
    res.json(existing);
    return;
  }

  const [participant] = await db.insert(sessionParticipantsTable).values({
    sessionId: session.id,
    userId,
    role: session.hostId === userId ? "presenter" : session.defaultRole,
  }).returning();

  res.status(201).json(participant);
});

router.post("/live/:shareCode/leave", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;
  const { userId } = req as AuthenticatedRequest;

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db.update(sessionParticipantsTable)
    .set({ leftAt: new Date() })
    .where(and(
      eq(sessionParticipantsTable.sessionId, session.id),
      eq(sessionParticipantsTable.userId, userId),
      isNull(sessionParticipantsTable.leftAt)
    ));

  res.sendStatus(204);
});

router.get("/live/:shareCode/participants", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const participants = await db.select({
    id: sessionParticipantsTable.id,
    userId: sessionParticipantsTable.userId,
    role: sessionParticipantsTable.role,
    joinedAt: sessionParticipantsTable.joinedAt,
    leftAt: sessionParticipantsTable.leftAt,
    userName: usersTable.displayName,
  })
    .from(sessionParticipantsTable)
    .leftJoin(usersTable, eq(sessionParticipantsTable.userId, usersTable.id))
    .where(eq(sessionParticipantsTable.sessionId, session.id))
    .orderBy(sessionParticipantsTable.joinedAt);

  res.json({ participants });
});

router.patch("/live/:shareCode/participants/:participantId/role", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;
  const participantId = req.params["participantId"] as string;
  const { userId } = req as AuthenticatedRequest;
  const { role } = req.body;

  if (!role || !["spectator", "editor", "presenter"].includes(role)) {
    res.status(400).json({ error: "Valid role is required (spectator, editor, presenter)" });
    return;
  }

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.hostId !== userId) {
    res.status(403).json({ error: "Only the host can change roles" });
    return;
  }

  const [updated] = await db.update(sessionParticipantsTable)
    .set({ role })
    .where(eq(sessionParticipantsTable.id, participantId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Participant not found" });
    return;
  }

  res.json(updated);
});

router.patch("/live/:shareCode", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;
  const { userId } = req as AuthenticatedRequest;

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.hostId !== userId) {
    res.status(403).json({ error: "Only the host can update the session" });
    return;
  }

  const { status, activeFile, title, allowChat, defaultRole } = req.body;
  const updateData: Record<string, unknown> = {};

  if (status && ["active", "paused", "ended"].includes(status)) {
    updateData["status"] = status;
    if (status === "ended") updateData["endedAt"] = new Date();
  }
  if (activeFile !== undefined) updateData["activeFile"] = activeFile;
  if (title) updateData["title"] = title;
  if (allowChat !== undefined) updateData["allowChat"] = allowChat;
  if (defaultRole) updateData["defaultRole"] = defaultRole;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db.update(liveSessionsTable)
    .set(updateData)
    .where(eq(liveSessionsTable.id, session.id))
    .returning();

  res.json(updated);
});

router.get("/live/:shareCode/chat", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;
  const limit = Math.min(parseInt(req.query["limit"] as string) || 100, 500);

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = await db.select({
    id: sessionChatTable.id,
    sessionId: sessionChatTable.sessionId,
    userId: sessionChatTable.userId,
    content: sessionChatTable.content,
    createdAt: sessionChatTable.createdAt,
    userName: usersTable.displayName,
  })
    .from(sessionChatTable)
    .leftJoin(usersTable, eq(sessionChatTable.userId, usersTable.id))
    .where(eq(sessionChatTable.sessionId, session.id))
    .orderBy(desc(sessionChatTable.createdAt))
    .limit(limit);

  res.json({ messages: messages.reverse() });
});

router.post("/live/:shareCode/chat", requireAuth, async (req, res): Promise<void> => {
  const shareCode = req.params["shareCode"] as string;
  const { userId } = req as AuthenticatedRequest;
  const { content } = req.body;

  if (!content || !content.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [session] = await db.select().from(liveSessionsTable).where(eq(liveSessionsTable.shareCode, shareCode));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (!session.allowChat) {
    res.status(403).json({ error: "Chat is disabled for this session" });
    return;
  }

  if (session.status === "ended") {
    res.status(410).json({ error: "Session has ended" });
    return;
  }

  const [message] = await db.insert(sessionChatTable).values({
    sessionId: session.id,
    userId,
    content: content.trim(),
  }).returning();

  const [user] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, userId));

  res.status(201).json({ ...message, userName: user?.displayName || null });
});

export default router;
