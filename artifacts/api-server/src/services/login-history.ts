import { db, loginHistoryTable } from "@workspace/db";
import { eq, desc, and, gt, sql } from "drizzle-orm";

export async function recordLogin(data: {
  userId: string;
  action: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  failureReason?: string;
}) {
  await db.insert(loginHistoryTable).values({
    userId: data.userId,
    action: data.action,
    success: data.success,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    method: data.method,
    failureReason: data.failureReason,
  });
}

export async function getRecentFailedAttemptsByIP(ipAddress: string, windowMinutes = 15): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginHistoryTable)
    .where(
      and(
        eq(loginHistoryTable.ipAddress, ipAddress),
        eq(loginHistoryTable.success, false),
        gt(loginHistoryTable.createdAt, since)
      )
    );
  return result?.count ?? 0;
}

export async function getLoginHistory(userId: string, limit = 50) {
  return db.select().from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, userId))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(limit);
}
