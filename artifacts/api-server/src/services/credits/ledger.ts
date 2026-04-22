import { db, creditsLedgerTable, autoTopupSettingsTable, usersTable } from "@workspace/db";
import { eq, and, sum, desc, sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface LedgerOptions {
  userId: string;
  amountMicroUsd: number;
  kind: typeof creditsLedgerTable.$inferInsert.kind;
  taskId?: string | null;
  invoiceId?: string | null;
  stripeEventId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export async function getBalanceMicroUsd(userId: string): Promise<number> {
  const [row] = await db.select({ total: sum(creditsLedgerTable.amountMicroUsd).mapWith(Number) })
    .from(creditsLedgerTable).where(eq(creditsLedgerTable.userId, userId));
  return Number(row?.total ?? 0);
}

export async function appendLedger(opts: LedgerOptions): Promise<{ id: string; balanceAfterMicroUsd: number }> {
  if (opts.stripeEventId) {
    const [existing] = await db.select({ id: creditsLedgerTable.id })
      .from(creditsLedgerTable)
      .where(and(eq(creditsLedgerTable.userId, opts.userId), eq(creditsLedgerTable.stripeEventId, opts.stripeEventId)))
      .limit(1);
    if (existing) {
      const balance = await getBalanceMicroUsd(opts.userId);
      return { id: existing.id, balanceAfterMicroUsd: balance };
    }
  }
  const [row] = await db.insert(creditsLedgerTable).values({
    userId: opts.userId,
    kind: opts.kind,
    amountMicroUsd: opts.amountMicroUsd,
    taskId: opts.taskId ?? null,
    invoiceId: opts.invoiceId ?? null,
    stripeEventId: opts.stripeEventId ?? null,
    description: opts.description ?? null,
    metadata: opts.metadata ?? null,
  }).returning({ id: creditsLedgerTable.id });
  const balance = await getBalanceMicroUsd(opts.userId);
  logger.debug({ userId: opts.userId, kind: opts.kind, amountMicroUsd: opts.amountMicroUsd, balance }, "ledger entry");
  return { id: row.id, balanceAfterMicroUsd: balance };
}

/**
 * Acquire a per-user advisory lock for the duration of the surrounding
 * transaction. Serializes concurrent ledger mutations for the same user so
 * balance checks and inserts cannot interleave.
 */
async function lockUser(tx: typeof db, userId: string): Promise<void> {
  // Stable 64-bit hash of the user id so the lock key is deterministic.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`);
}

/**
 * Reserve credits for a task by inserting a "task_debit" hold entry inside a
 * locked transaction. Fails (returns ok=false) if the resulting balance would
 * go negative. Returns the reservation id so it can be settled (adjusted to
 * actual usage) or released later.
 */
export async function reserve(
  userId: string,
  amountMicroUsd: number,
  taskId: string,
  description?: string,
): Promise<{ ok: true; id: string; balanceAfterMicroUsd: number } | { ok: false; balanceMicroUsd: number }> {
  if (amountMicroUsd <= 0) {
    const balance = await getBalanceMicroUsd(userId);
    return { ok: true, id: "", balanceAfterMicroUsd: balance };
  }
  return db.transaction(async (tx) => {
    await lockUser(tx as unknown as typeof db, userId);
    const [b] = await tx.select({ total: sum(creditsLedgerTable.amountMicroUsd).mapWith(Number) })
      .from(creditsLedgerTable).where(eq(creditsLedgerTable.userId, userId));
    const balance = Number(b?.total ?? 0);
    if (balance < amountMicroUsd) {
      return { ok: false as const, balanceMicroUsd: balance };
    }
    const [row] = await tx.insert(creditsLedgerTable).values({
      userId, kind: "task_debit", amountMicroUsd: -amountMicroUsd, taskId,
      description: description ?? "Task reservation",
      metadata: { reservation: true },
    }).returning({ id: creditsLedgerTable.id });
    return { ok: true as const, id: row.id, balanceAfterMicroUsd: balance - amountMicroUsd };
  });
}

/**
 * Settle a reservation strictly append-only:
 *  - Read the original reservation row (a negative `task_debit` with
 *    metadata.reservation=true).
 *  - Insert a positive `task_refund` row that fully reverses it
 *    (metadata.releasesReservation=<id>).
 *  - Insert a negative `task_debit` row for the actual consumed amount
 *    (metadata.settlesReservation=<id>).
 * The original reservation row is never deleted, preserving the
 * append-only audit trail. Idempotent: if a settlement row already
 * exists for this reservationId, returns the existing balance without
 * inserting again.
 */
export async function settleReservation(
  userId: string,
  reservationId: string | null,
  actualAmountMicroUsd: number,
  taskId: string,
  description?: string,
): Promise<{ id: string; balanceAfterMicroUsd: number }> {
  const safeActual = Math.max(0, actualAmountMicroUsd);
  return db.transaction(async (tx) => {
    await lockUser(tx as unknown as typeof db, userId);

    if (reservationId) {
      const [already] = await tx.select({ id: creditsLedgerTable.id })
        .from(creditsLedgerTable)
        .where(sql`${creditsLedgerTable.userId} = ${userId}
          AND ${creditsLedgerTable.metadata}->>'settlesReservation' = ${reservationId}`)
        .limit(1);
      if (already) {
        const [b0] = await tx.select({ total: sum(creditsLedgerTable.amountMicroUsd).mapWith(Number) })
          .from(creditsLedgerTable).where(eq(creditsLedgerTable.userId, userId));
        return { id: already.id, balanceAfterMicroUsd: Number(b0?.total ?? 0) };
      }

      const [reservation] = await tx.select()
        .from(creditsLedgerTable)
        .where(eq(creditsLedgerTable.id, reservationId))
        .limit(1);
      if (reservation) {
        const heldMicroUsd = -Number(reservation.amountMicroUsd);
        if (heldMicroUsd > 0) {
          await tx.insert(creditsLedgerTable).values({
            userId, kind: "task_refund", amountMicroUsd: heldMicroUsd, taskId,
            description: "Release reservation",
            metadata: { releasesReservation: reservationId },
          });
        }
      }
    }

    let id = "";
    if (safeActual > 0) {
      const [row] = await tx.insert(creditsLedgerTable).values({
        userId, kind: "task_debit", amountMicroUsd: -safeActual, taskId,
        description: description ?? "Task usage",
        metadata: reservationId ? { settlesReservation: reservationId } : undefined,
      }).returning({ id: creditsLedgerTable.id });
      id = row.id;
    }

    const [b] = await tx.select({ total: sum(creditsLedgerTable.amountMicroUsd).mapWith(Number) })
      .from(creditsLedgerTable).where(eq(creditsLedgerTable.userId, userId));
    return { id, balanceAfterMicroUsd: Number(b?.total ?? 0) };
  });
}

export async function debit(userId: string, amountMicroUsd: number, taskId: string, description?: string): Promise<{ id: string; balanceAfterMicroUsd: number }> {
  if (amountMicroUsd <= 0) {
    const balance = await getBalanceMicroUsd(userId);
    return { id: "", balanceAfterMicroUsd: balance };
  }
  return db.transaction(async (tx) => {
    await lockUser(tx as unknown as typeof db, userId);
    const [row] = await tx.insert(creditsLedgerTable).values({
      userId, kind: "task_debit", amountMicroUsd: -amountMicroUsd, taskId,
      description: description ?? "Task usage",
    }).returning({ id: creditsLedgerTable.id });
    const [b] = await tx.select({ total: sum(creditsLedgerTable.amountMicroUsd).mapWith(Number) })
      .from(creditsLedgerTable).where(eq(creditsLedgerTable.userId, userId));
    return { id: row.id, balanceAfterMicroUsd: Number(b?.total ?? 0) };
  });
}

export async function refund(userId: string, amountMicroUsd: number, taskId: string, description?: string): Promise<{ id: string; balanceAfterMicroUsd: number }> {
  if (amountMicroUsd <= 0) {
    const balance = await getBalanceMicroUsd(userId);
    return { id: "", balanceAfterMicroUsd: balance };
  }
  return appendLedger({ userId, amountMicroUsd, kind: "task_refund", taskId, description: description ?? "Auto-refund unused credits" });
}

export async function listLedger(userId: string, limit = 50, cursor?: string): Promise<typeof creditsLedgerTable.$inferSelect[]> {
  const conditions = [eq(creditsLedgerTable.userId, userId)];
  if (cursor) {
    conditions.push(sql`${creditsLedgerTable.createdAt} < (SELECT created_at FROM credits_ledger WHERE id = ${cursor})`);
  }
  return db.select().from(creditsLedgerTable).where(and(...conditions)).orderBy(desc(creditsLedgerTable.createdAt)).limit(limit);
}

export async function getAutoTopup(userId: string): Promise<typeof autoTopupSettingsTable.$inferSelect | null> {
  const [row] = await db.select().from(autoTopupSettingsTable).where(eq(autoTopupSettingsTable.userId, userId));
  return row ?? null;
}

export async function upsertAutoTopup(userId: string, patch: Partial<typeof autoTopupSettingsTable.$inferInsert>): Promise<typeof autoTopupSettingsTable.$inferSelect> {
  const existing = await getAutoTopup(userId);
  if (!existing) {
    const [row] = await db.insert(autoTopupSettingsTable).values({ userId, ...patch }).returning();
    return row;
  }
  const [row] = await db.update(autoTopupSettingsTable).set(patch).where(eq(autoTopupSettingsTable.userId, userId)).returning();
  return row;
}

export async function getMonthlyBurn(userId: string, months = 6): Promise<{ month: string; debitedMicroUsd: number; refundedMicroUsd: number }[]> {
  const rows = await db.execute<{ month: string; debited: string; refunded: string }>(sql`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN kind = 'task_debit' THEN -amount_micro_usd ELSE 0 END), 0)::text AS debited,
           COALESCE(SUM(CASE WHEN kind IN ('task_refund', 'stripe_refund') THEN amount_micro_usd ELSE 0 END), 0)::text AS refunded
    FROM credits_ledger
    WHERE user_id = ${userId}
      AND created_at >= date_trunc('month', NOW()) - INTERVAL '${sql.raw(String(months - 1))} months'
    GROUP BY 1 ORDER BY 1 ASC
  `);
  type BurnRow = { month: string; debited: string; refunded: string };
  return (rows.rows as BurnRow[]).map((r) => ({ month: r.month, debitedMicroUsd: Number(r.debited), refundedMicroUsd: Number(r.refunded) }));
}

export async function isAdmin(userId: string): Promise<boolean> {
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return u?.role === "admin";
}
