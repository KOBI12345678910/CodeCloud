import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, projectsTable, projectTransfersTable, usersTable, collaboratorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { logAudit, getClientIp, getUserAgent } from "../services/audit";
import {
  sendEmail,
  transferRequestEmail,
  transferConfirmationEmail,
  transferDeclinedEmail,
  transferCancelledEmail,
} from "../services/email";

const router = Router();
const TRANSFER_EXPIRY_DAYS = 7;
const BASE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "http://localhost:3000";

router.post("/projects/:projectId/transfer", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const userId = (req as any).userId as string;
  const { toEmail, toUsername, message } = req.body;

  if (!toEmail && !toUsername) {
    res.status(400).json({ error: "toEmail or toUsername is required" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.ownerId !== userId) {
    res.status(403).json({ error: "Only the project owner can initiate a transfer" });
    return;
  }

  let recipientEmail = toEmail;
  let recipientUser: { id: string; email: string; username: string } | undefined;

  if (toUsername) {
    const [user] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
    }).from(usersTable).where(eq(usersTable.username, toUsername));

    if (!user) {
      res.status(404).json({ error: "Recipient user not found" });
      return;
    }
    recipientUser = user;
    recipientEmail = user.email;
  } else {
    const [user] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
    }).from(usersTable).where(eq(usersTable.email, toEmail));
    if (user) recipientUser = user;
  }

  if (recipientUser && recipientUser.id === userId) {
    res.status(400).json({ error: "Cannot transfer to yourself" });
    return;
  }

  const existingPending = await db.select()
    .from(projectTransfersTable)
    .where(
      and(
        eq(projectTransfersTable.projectId, projectId),
        eq(projectTransfersTable.status, "pending")
      )
    );

  if (existingPending.length > 0) {
    res.status(409).json({ error: "A pending transfer already exists for this project" });
    return;
  }

  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + TRANSFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [fromUser] = await db.select({
    username: usersTable.username,
  }).from(usersTable).where(eq(usersTable.id, userId));

  const [transfer] = await db.insert(projectTransfersTable).values({
    projectId,
    fromUserId: userId,
    toUserId: recipientUser?.id ?? null,
    toEmail: recipientEmail,
    status: "pending",
    token,
    message: message || null,
    expiresAt,
  }).returning();

  const acceptUrl = `${BASE_URL}/transfer/${transfer.id}/accept?token=${token}`;
  const declineUrl = `${BASE_URL}/transfer/${transfer.id}/decline?token=${token}`;

  const email = transferRequestEmail(
    fromUser?.username || "A user",
    project.name,
    message || null,
    acceptUrl,
    declineUrl
  );
  email.to = recipientEmail;
  await sendEmail(email);

  logAudit({
    userId,
    action: "project.transfer.initiated",
    resourceType: "project",
    resourceId: projectId,
    metadata: {
      toEmail: recipientEmail,
      toUserId: recipientUser?.id,
      transferId: transfer.id,
    },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({
    id: transfer.id,
    projectId,
    toEmail: recipientEmail,
    status: "pending",
    expiresAt: transfer.expiresAt,
    createdAt: transfer.createdAt,
  });
});

router.get("/projects/:projectId/transfer", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const userId = (req as any).userId as string;

  const transfers = await db.select({
    id: projectTransfersTable.id,
    projectId: projectTransfersTable.projectId,
    toEmail: projectTransfersTable.toEmail,
    status: projectTransfersTable.status,
    message: projectTransfersTable.message,
    expiresAt: projectTransfersTable.expiresAt,
    respondedAt: projectTransfersTable.respondedAt,
    createdAt: projectTransfersTable.createdAt,
    fromUsername: usersTable.username,
  })
    .from(projectTransfersTable)
    .innerJoin(usersTable, eq(projectTransfersTable.fromUserId, usersTable.id))
    .where(eq(projectTransfersTable.projectId, projectId));

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project || (project.ownerId !== userId)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(transfers);
});

router.post("/transfer/:transferId/accept", async (req: Request, res: Response): Promise<void> => {
  const transferId = req.params.transferId as string;
  const { token } = req.body.token ? req.body : req.query;

  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  const [transfer] = await db.select()
    .from(projectTransfersTable)
    .where(
      and(
        eq(projectTransfersTable.id, transferId),
        eq(projectTransfersTable.token, token as string)
      )
    );

  if (!transfer) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  if (transfer.status !== "pending") {
    res.status(400).json({ error: `Transfer is already ${transfer.status}` });
    return;
  }

  if (new Date() > transfer.expiresAt) {
    await db.update(projectTransfersTable)
      .set({ status: "expired", respondedAt: new Date() })
      .where(eq(projectTransfersTable.id, transferId));
    res.status(410).json({ error: "Transfer has expired" });
    return;
  }

  let recipientId = transfer.toUserId;

  if (!recipientId) {
    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, transfer.toEmail));

    if (!user) {
      res.status(400).json({ error: "Recipient must have a CodeCloud account to accept" });
      return;
    }
    recipientId = user.id;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, transfer.projectId));
  if (!project) {
    res.status(404).json({ error: "Project no longer exists" });
    return;
  }

  const previousOwnerId = project.ownerId;

  await db.update(projectsTable)
    .set({ ownerId: recipientId })
    .where(eq(projectsTable.id, transfer.projectId));

  const existingCollab = await db.select()
    .from(collaboratorsTable)
    .where(
      and(
        eq(collaboratorsTable.projectId, transfer.projectId),
        eq(collaboratorsTable.userId, previousOwnerId)
      )
    );

  if (existingCollab.length === 0) {
    await db.insert(collaboratorsTable).values({
      projectId: transfer.projectId,
      userId: previousOwnerId,
      role: "admin",
      invitedBy: recipientId,
    });
  } else {
    await db.update(collaboratorsTable)
      .set({ role: "admin" })
      .where(
        and(
          eq(collaboratorsTable.projectId, transfer.projectId),
          eq(collaboratorsTable.userId, previousOwnerId)
        )
      );
  }

  const existingNewOwnerCollab = await db.select()
    .from(collaboratorsTable)
    .where(
      and(
        eq(collaboratorsTable.projectId, transfer.projectId),
        eq(collaboratorsTable.userId, recipientId)
      )
    );

  if (existingNewOwnerCollab.length > 0) {
    await db.delete(collaboratorsTable)
      .where(
        and(
          eq(collaboratorsTable.projectId, transfer.projectId),
          eq(collaboratorsTable.userId, recipientId)
        )
      );
  }

  await db.update(projectTransfersTable)
    .set({ status: "accepted", respondedAt: new Date(), toUserId: recipientId })
    .where(eq(projectTransfersTable.id, transferId));

  const [fromUser] = await db.select({ username: usersTable.username, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, previousOwnerId));
  const [toUser] = await db.select({ username: usersTable.username, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, recipientId));

  if (fromUser) {
    const ownerEmail = transferConfirmationEmail(project.name, toUser?.username || transfer.toEmail, true);
    ownerEmail.to = fromUser.email;
    await sendEmail(ownerEmail);
  }

  if (toUser) {
    const newOwnerEmail = transferConfirmationEmail(project.name, toUser.username, false);
    newOwnerEmail.to = toUser.email;
    await sendEmail(newOwnerEmail);
  }

  logAudit({
    userId: recipientId,
    action: "project.transfer.accepted",
    resourceType: "project",
    resourceId: transfer.projectId,
    metadata: {
      transferId,
      previousOwnerId,
      newOwnerId: recipientId,
    },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ success: true, projectId: transfer.projectId });
});

router.post("/transfer/:transferId/decline", async (req: Request, res: Response): Promise<void> => {
  const transferId = req.params.transferId as string;
  const { token } = req.body.token ? req.body : req.query;

  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  const [transfer] = await db.select()
    .from(projectTransfersTable)
    .where(
      and(
        eq(projectTransfersTable.id, transferId),
        eq(projectTransfersTable.token, token as string)
      )
    );

  if (!transfer) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  if (transfer.status !== "pending") {
    res.status(400).json({ error: `Transfer is already ${transfer.status}` });
    return;
  }

  await db.update(projectTransfersTable)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(projectTransfersTable.id, transferId));

  const [fromUser] = await db.select({ email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, transfer.fromUserId));
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, transfer.projectId));

  const [recipientUser] = transfer.toUserId
    ? await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, transfer.toUserId))
    : [{ username: transfer.toEmail }];

  if (fromUser && project) {
    const email = transferDeclinedEmail(project.name, recipientUser?.username || transfer.toEmail);
    email.to = fromUser.email;
    await sendEmail(email);
  }

  logAudit({
    userId: transfer.toUserId || "unknown",
    action: "project.transfer.declined",
    resourceType: "project",
    resourceId: transfer.projectId,
    metadata: { transferId },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ success: true });
});

router.post("/projects/:projectId/transfer/cancel", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.projectId as string;
  const userId = (req as any).userId as string;

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project || project.ownerId !== userId) {
    res.status(403).json({ error: "Only the project owner can cancel a transfer" });
    return;
  }

  const [transfer] = await db.select()
    .from(projectTransfersTable)
    .where(
      and(
        eq(projectTransfersTable.projectId, projectId),
        eq(projectTransfersTable.status, "pending")
      )
    );

  if (!transfer) {
    res.status(404).json({ error: "No pending transfer found" });
    return;
  }

  await db.update(projectTransfersTable)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(eq(projectTransfersTable.id, transfer.id));

  const [fromUser] = await db.select({ username: usersTable.username })
    .from(usersTable).where(eq(usersTable.id, userId));

  const email = transferCancelledEmail(project.name, fromUser?.username || "Owner");
  email.to = transfer.toEmail;
  await sendEmail(email);

  logAudit({
    userId,
    action: "project.transfer.cancelled",
    resourceType: "project",
    resourceId: projectId,
    metadata: { transferId: transfer.id },
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    correlationId: req.headers["x-request-id"] as string,
  });

  res.json({ success: true });
});

export default router;
