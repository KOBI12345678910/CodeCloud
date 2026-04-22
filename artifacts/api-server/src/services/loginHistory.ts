import { db, loginHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export async function recordLogin(opts: {
  userId: string;
  success: boolean;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  failReason?: string;
}) {
  await db.insert(loginHistoryTable).values({
    userId: opts.userId,
    success: opts.success,
    method: opts.method,
    ipAddress: opts.ipAddress || null,
    userAgent: opts.userAgent || null,
    failReason: opts.failReason || null,
  });
}

export async function getLoginHistory(userId: string, limit = 20) {
  return db
    .select()
    .from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, userId))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(limit);
}
