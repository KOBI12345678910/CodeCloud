import { db, userSessionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const DEFAULT_SESSION_TTL_DAYS = 30;

function parseUserAgent(ua: string): string {
  if (!ua) return "Unknown Device";
  if (ua.includes("Mobile")) return "Mobile Browser";
  if (ua.includes("Chrome")) return "Chrome Browser";
  if (ua.includes("Firefox")) return "Firefox Browser";
  if (ua.includes("Safari")) return "Safari Browser";
  if (ua.includes("Edge")) return "Edge Browser";
  return "Web Browser";
}

export async function createSession(data: {
  userId: string;
  tokenFamily?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_SESSION_TTL_DAYS);

  const [session] = await db.insert(userSessionsTable).values({
    userId: data.userId,
    tokenFamily: data.tokenFamily,
    ipAddress: data.ipAddress || "unknown",
    userAgent: data.userAgent,
    deviceInfo: parseUserAgent(data.userAgent || ""),
    location: data.location || "Unknown",
    active: true,
    expiresAt,
  }).returning();

  return session;
}

export async function listUserSessions(userId: string) {
  return db.select().from(userSessionsTable)
    .where(and(eq(userSessionsTable.userId, userId), eq(userSessionsTable.active, true)))
    .orderBy(desc(userSessionsTable.lastActivity));
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const [session] = await db.select().from(userSessionsTable).where(eq(userSessionsTable.id, sessionId));
  if (!session) return false;

  const [updated] = await db.update(userSessionsTable)
    .set({ active: false })
    .where(eq(userSessionsTable.id, sessionId))
    .returning();

  if (updated && session.tokenFamily) {
    const { revokeTokenFamily } = await import("./token");
    await revokeTokenFamily(session.tokenFamily);
  }

  return !!updated;
}

export async function revokeAllSessions(userId: string, exceptId?: string): Promise<number> {
  if (exceptId) {
    const sessions = await db.select().from(userSessionsTable)
      .where(and(eq(userSessionsTable.userId, userId), eq(userSessionsTable.active, true)));

    let count = 0;
    for (const session of sessions) {
      if (session.id !== exceptId) {
        await db.update(userSessionsTable).set({ active: false }).where(eq(userSessionsTable.id, session.id));
        count++;
      }
    }
    return count;
  }

  const sessions = await db.select().from(userSessionsTable)
    .where(and(eq(userSessionsTable.userId, userId), eq(userSessionsTable.active, true)));

  await db.update(userSessionsTable)
    .set({ active: false })
    .where(and(eq(userSessionsTable.userId, userId), eq(userSessionsTable.active, true)));

  return sessions.length;
}

export async function touchSession(sessionId: string): Promise<boolean> {
  const [updated] = await db.update(userSessionsTable)
    .set({ lastActivity: new Date() })
    .where(eq(userSessionsTable.id, sessionId))
    .returning();
  return !!updated;
}
