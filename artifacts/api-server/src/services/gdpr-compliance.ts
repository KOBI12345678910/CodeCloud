import {
  db,
  dsarRequestsTable,
  usersTable,
  projectsTable,
  auditLogTable,
  userConsentsTable,
  apiKeysTable,
  collaboratorsTable,
  aiConversationsTable,
  aiMessagesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, gte, desc, count, lte } from "drizzle-orm";
import { logger } from "../lib/logger";

const RATE_LIMIT_DAYS = 7;
const DELETION_GRACE_DAYS = 30;

export async function requestDataExport(userId: string): Promise<{ id: string; status: string } | { error: string }> {
  const recent = await db
    .select()
    .from(dsarRequestsTable)
    .where(
      and(
        eq(dsarRequestsTable.userId, userId),
        eq(dsarRequestsTable.type, "export"),
        gte(dsarRequestsTable.createdAt, new Date(Date.now() - RATE_LIMIT_DAYS * 86400000))
      )
    );

  if (recent.length > 0) {
    return { error: `You can only request one data export every ${RATE_LIMIT_DAYS} days` };
  }

  const [request] = await db.insert(dsarRequestsTable).values({
    userId,
    type: "export",
    status: "pending",
  }).returning();

  setTimeout(() => processDataExport(request.id, userId), 1000);

  return { id: request.id, status: request.status };
}

async function processDataExport(requestId: string, userId: string): Promise<void> {
  try {
    await db.update(dsarRequestsTable)
      .set({ status: "processing" })
      .where(eq(dsarRequestsTable.id, requestId));

    const [user] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      displayName: usersTable.displayName,
      bio: usersTable.bio,
      plan: usersTable.plan,
      createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, userId));

    const projects = await db.select({
      id: projectsTable.id,
      name: projectsTable.name,
      slug: projectsTable.slug,
      description: projectsTable.description,
      language: projectsTable.language,
      createdAt: projectsTable.createdAt,
    }).from(projectsTable).where(eq(projectsTable.ownerId, userId));

    const consents = await db.select()
      .from(userConsentsTable)
      .where(eq(userConsentsTable.userId, userId));

    const apiKeys = await db.select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      scopes: apiKeysTable.scopes,
      createdAt: apiKeysTable.createdAt,
    }).from(apiKeysTable).where(eq(apiKeysTable.userId, userId));

    const collaborations = await db.select({
      id: collaboratorsTable.id,
      projectId: collaboratorsTable.projectId,
      role: collaboratorsTable.role,
      createdAt: collaboratorsTable.createdAt,
    }).from(collaboratorsTable).where(eq(collaboratorsTable.userId, userId));

    let aiConversations: any[] = [];
    try {
      aiConversations = await db.select({
        id: aiConversationsTable.id,
        title: aiConversationsTable.title,
        createdAt: aiConversationsTable.createdAt,
      }).from(aiConversationsTable).where(eq(aiConversationsTable.userId, userId));
    } catch {}

    let notifications: any[] = [];
    try {
      notifications = await db.select({
        id: notificationsTable.id,
        type: notificationsTable.type,
        message: notificationsTable.message,
        createdAt: notificationsTable.createdAt,
      }).from(notificationsTable).where(eq(notificationsTable.userId, userId));
    } catch {}

    const auditLogs = await db.select({
      id: auditLogTable.id,
      action: auditLogTable.action,
      resourceType: auditLogTable.resourceType,
      resourceId: auditLogTable.resourceId,
      createdAt: auditLogTable.createdAt,
    }).from(auditLogTable)
      .where(eq(auditLogTable.userId, userId))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(1000);

    const downloadUrl = `/api/privacy/exports/${requestId}/download`;

    const exportData = {
      exportInfo: {
        requestId,
        exportedAt: new Date().toISOString(),
        dataController: "CodeCloud, Inc.",
        format: "GDPR Article 20 - Right to Data Portability",
      },
      profile: user,
      projects,
      apiKeys,
      collaborations,
      consents,
      aiConversations,
      notifications,
      auditLogs,
    };

    await db.update(dsarRequestsTable).set({
      status: "completed",
      completedAt: new Date(),
      downloadUrl,
      metadata: JSON.stringify(exportData),
    }).where(eq(dsarRequestsTable.id, requestId));

    logger.info({ requestId, userId }, "DSAR export completed");
  } catch (err) {
    await db.update(dsarRequestsTable)
      .set({ status: "failed" })
      .where(eq(dsarRequestsTable.id, requestId));
    logger.error({ err, requestId }, "DSAR export failed");
  }
}

export async function requestAccountDeletion(userId: string, reason?: string): Promise<{ id: string; scheduledPurgeAt: Date }> {
  const existing = await db
    .select()
    .from(dsarRequestsTable)
    .where(
      and(
        eq(dsarRequestsTable.userId, userId),
        eq(dsarRequestsTable.type, "deletion"),
        eq(dsarRequestsTable.status, "pending")
      )
    );

  if (existing.length > 0) {
    return { id: existing[0].id, scheduledPurgeAt: existing[0].scheduledPurgeAt! };
  }

  const scheduledPurgeAt = new Date(Date.now() + DELETION_GRACE_DAYS * 86400000);

  const [request] = await db.insert(dsarRequestsTable).values({
    userId,
    type: "deletion",
    status: "pending",
    reason: reason || null,
    scheduledPurgeAt,
  }).returning();

  return { id: request.id, scheduledPurgeAt };
}

export async function cancelDeletion(requestId: string, userId: string): Promise<boolean> {
  const [request] = await db
    .select()
    .from(dsarRequestsTable)
    .where(
      and(
        eq(dsarRequestsTable.id, requestId),
        eq(dsarRequestsTable.userId, userId),
        eq(dsarRequestsTable.type, "deletion"),
        eq(dsarRequestsTable.status, "pending")
      )
    );

  if (!request) return false;

  await db.update(dsarRequestsTable).set({
    status: "cancelled",
    cancelledAt: new Date(),
  }).where(eq(dsarRequestsTable.id, requestId));

  return true;
}

export async function getUserDsarRequests(userId: string) {
  return db.select()
    .from(dsarRequestsTable)
    .where(eq(dsarRequestsTable.userId, userId))
    .orderBy(desc(dsarRequestsTable.createdAt));
}

export async function getExportData(requestId: string, userId: string) {
  const [request] = await db
    .select()
    .from(dsarRequestsTable)
    .where(
      and(
        eq(dsarRequestsTable.id, requestId),
        eq(dsarRequestsTable.userId, userId),
        eq(dsarRequestsTable.type, "export"),
        eq(dsarRequestsTable.status, "completed")
      )
    );

  if (!request || !request.metadata) return null;
  return JSON.parse(request.metadata);
}

export async function getDsarStats() {
  const pending = await db.select({ count: count() })
    .from(dsarRequestsTable)
    .where(eq(dsarRequestsTable.status, "pending"));

  const exports = await db.select({ count: count() })
    .from(dsarRequestsTable)
    .where(eq(dsarRequestsTable.type, "export"));

  const deletions = await db.select({ count: count() })
    .from(dsarRequestsTable)
    .where(eq(dsarRequestsTable.type, "deletion"));

  const allRequests = await db.select()
    .from(dsarRequestsTable)
    .orderBy(desc(dsarRequestsTable.createdAt))
    .limit(50);

  return {
    pendingCount: pending[0]?.count || 0,
    totalExports: exports[0]?.count || 0,
    totalDeletions: deletions[0]?.count || 0,
    recentRequests: allRequests,
  };
}

export async function processExpiredDeletions(): Promise<number> {
  const expired = await db
    .select()
    .from(dsarRequestsTable)
    .where(
      and(
        eq(dsarRequestsTable.type, "deletion"),
        eq(dsarRequestsTable.status, "pending"),
        lte(dsarRequestsTable.scheduledPurgeAt, new Date())
      )
    );

  let purged = 0;
  for (const request of expired) {
    try {
      await db.update(dsarRequestsTable)
        .set({ status: "processing" })
        .where(eq(dsarRequestsTable.id, request.id));

      await db.delete(apiKeysTable).where(eq(apiKeysTable.userId, request.userId));
      await db.delete(collaboratorsTable).where(eq(collaboratorsTable.userId, request.userId));
      await db.delete(userConsentsTable).where(eq(userConsentsTable.userId, request.userId));

      try {
        await db.delete(aiMessagesTable).where(eq(aiMessagesTable.userId, request.userId));
        await db.delete(aiConversationsTable).where(eq(aiConversationsTable.userId, request.userId));
      } catch {}

      try {
        await db.delete(notificationsTable).where(eq(notificationsTable.userId, request.userId));
      } catch {}

      const userProjects = await db.select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.ownerId, request.userId));

      for (const project of userProjects) {
        await db.delete(projectsTable).where(eq(projectsTable.id, project.id));
      }

      await db.delete(usersTable).where(eq(usersTable.id, request.userId));

      await db.update(dsarRequestsTable).set({
        status: "completed",
        completedAt: new Date(),
      }).where(eq(dsarRequestsTable.id, request.id));

      purged++;
      logger.info({ requestId: request.id, userId: request.userId }, "Account deletion completed");
    } catch (err) {
      await db.update(dsarRequestsTable)
        .set({ status: "failed" })
        .where(eq(dsarRequestsTable.id, request.id));
      logger.error({ err, requestId: request.id }, "Account deletion failed");
    }
  }

  return purged;
}
