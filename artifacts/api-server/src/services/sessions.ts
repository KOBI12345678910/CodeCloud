import { db, activeSessionsTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { revokeTokenFamily } from "./token";

function parseDeviceLabel(userAgent?: string): string {
  if (!userAgent) return "Unknown Device";
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const parts = [];
  if (browser.name) parts.push(`${browser.name}${browser.version ? ` ${browser.version.split(".")[0]}` : ""}`);
  if (os.name) parts.push(`${os.name}${os.version ? ` ${os.version}` : ""}`);
  return parts.join(" on ") || "Unknown Device";
}

export async function createSession(opts: {
  userId: string;
  tokenFamily: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const deviceLabel = parseDeviceLabel(opts.userAgent);

  const [session] = await db
    .insert(activeSessionsTable)
    .values({
      userId: opts.userId,
      tokenFamily: opts.tokenFamily,
      ipAddress: opts.ipAddress || null,
      userAgent: opts.userAgent || null,
      deviceLabel,
    })
    .returning();

  return session;
}

export async function getUserSessions(userId: string) {
  return db
    .select()
    .from(activeSessionsTable)
    .where(
      and(
        eq(activeSessionsTable.userId, userId),
        isNull(activeSessionsTable.revokedAt)
      )
    )
    .orderBy(desc(activeSessionsTable.lastActiveAt));
}

export async function revokeSession(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(activeSessionsTable)
    .where(
      and(
        eq(activeSessionsTable.id, sessionId),
        eq(activeSessionsTable.userId, userId)
      )
    );

  if (session?.tokenFamily) {
    await revokeTokenFamily(session.tokenFamily);
  }

  await db
    .update(activeSessionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(activeSessionsTable.id, sessionId),
        eq(activeSessionsTable.userId, userId)
      )
    );
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  if (exceptSessionId) {
    const sessions = await getUserSessions(userId);
    for (const s of sessions) {
      if (s.id !== exceptSessionId) {
        await revokeSession(s.id, userId);
      }
    }
  } else {
    const sessions = await getUserSessions(userId);
    for (const s of sessions) {
      await revokeSession(s.id, userId);
    }
  }
}

export async function touchSession(tokenFamily: string) {
  await db
    .update(activeSessionsTable)
    .set({ lastActiveAt: new Date() })
    .where(eq(activeSessionsTable.tokenFamily, tokenFamily));
}
