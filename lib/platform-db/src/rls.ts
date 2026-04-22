import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Tenant scoping for row-level security.
 *
 * IMPORTANT — Postgres set_config('app.tenant_id', ..., is_local=true)
 * is *transaction-local*, and connection pools rotate connections per
 * statement. So the only safe way to bind a tenant to a sequence of
 * queries is to:
 *
 *   1. Open a transaction (which pins a single connection for its
 *      duration).
 *   2. Set the GUC with is_local=true (so it auto-resets on commit).
 *   3. Run all tenant-scoped work inside that transaction, passing the
 *      transaction handle (`tx`) explicitly to every helper.
 *
 * `withTenant` enforces this by accepting a callback that receives the
 * transaction handle and refusing to run tenant work outside one.
 */
type TxHandle<TSchema extends Record<string, unknown>> = Parameters<
  Parameters<NodePgDatabase<TSchema>["transaction"]>[0]
>[0];

/** Set tenant on the *transaction* handle. Must be called inside a tx. */
export async function setTenantOnTx<TSchema extends Record<string, unknown>>(
  tx: TxHandle<TSchema>,
  tenantId: string | null,
): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId ?? ""}, true)`);
}

/**
 * Run `fn` inside a transaction with `app.tenant_id` set to `tenantId`.
 * Every query inside `fn` MUST go through `tx` so it lands on the same
 * pinned connection. Queries issued against the outer `db` will land on
 * a different pool connection without the tenant context — that's a bug
 * caller-side, but the contract is now explicit.
 */
export async function withTenant<TSchema extends Record<string, unknown>, T>(
  db: NodePgDatabase<TSchema>,
  tenantId: string,
  fn: (tx: TxHandle<TSchema>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await setTenantOnTx(tx, tenantId);
    return fn(tx);
  });
}

/**
 * @deprecated Unsafe: rotates connections in pools. Use `withTenant`
 * instead, which pins a connection inside a transaction.
 */
export async function setTenant<TSchema extends Record<string, unknown>>(
  _db: NodePgDatabase<TSchema>,
  _tenantId: string | null,
): Promise<void> {
  throw new Error(
    "setTenant() is unsafe in pooled connections. Use withTenant(db, tenantId, async (tx) => { ... }) so all tenant-scoped queries share one pinned connection.",
  );
}
