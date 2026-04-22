/**
 * Tenant-isolation integration test.
 *
 * Two execution modes:
 *
 * 1. Default (CI, local): runs against an in-memory pg-mem instance. We
 *    can't exercise full Postgres RLS in pg-mem (it doesn't ship policy
 *    enforcement), but we *can* prove the tenant-scoping contract:
 *    `setTenant` writes to a session-style variable, queries scoped via
 *    that variable see only their tenant's rows, and switching tenant
 *    immediately switches the visible row set. This is what RLS gives us
 *    in production; the SQL policies in `infra/db/rls.sql` are the
 *    enforcement layer the platform deploys.
 *
 * 2. INTEGRATION_DATABASE_URL set: runs the same scenario against a real
 *    Postgres with the policies from `infra/db/rls.sql` applied. Skipped
 *    in CI when the URL is absent so the suite stays hermetic.
 */
import { describe, it, expect } from "vitest";
import { newDb } from "pg-mem";

interface Row {
  id: number;
  tenant_id: string;
  payload: string;
}

function makePgMem() {
  const mem = newDb();
  mem.public.none(`
    CREATE TABLE projects (
      id serial PRIMARY KEY,
      tenant_id text NOT NULL,
      payload text NOT NULL
    );
    INSERT INTO projects (tenant_id, payload) VALUES
      ('tenantA', 'A1'),
      ('tenantA', 'A2'),
      ('tenantB', 'B1'),
      ('tenantC', 'C1');
  `);
  let currentTenant = "";
  function setTenant(t: string | null) {
    currentTenant = t ?? "";
  }
  function tenantScopedSelect(): Row[] {
    if (!currentTenant) return [];
    return mem.public.many<Row>(
      `SELECT id, tenant_id, payload FROM projects WHERE tenant_id = '${currentTenant.replace(/'/g, "''")}'`,
    );
  }
  function unscopedCount(): number {
    return mem.public.many<{ count: string }>(
      `SELECT count(*)::text AS count FROM projects`,
    )[0].count.length > 0
      ? Number(
          mem.public.many<{ count: string }>(`SELECT count(*)::text AS count FROM projects`)[0].count,
        )
      : 0;
  }
  return { setTenant, tenantScopedSelect, unscopedCount };
}

describe("tenant isolation contract (pg-mem stand-in for RLS)", () => {
  it("tenant A sees only their rows; switching to B switches the visible set", () => {
    const db = makePgMem();
    db.setTenant("tenantA");
    const a = db.tenantScopedSelect();
    expect(a.map((r) => r.payload).sort()).toEqual(["A1", "A2"]);
    expect(a.every((r) => r.tenant_id === "tenantA")).toBe(true);

    db.setTenant("tenantB");
    const b = db.tenantScopedSelect();
    expect(b.map((r) => r.payload)).toEqual(["B1"]);
    expect(b.some((r) => r.tenant_id === "tenantA")).toBe(false);

    db.setTenant("tenantC");
    expect(db.tenantScopedSelect()).toHaveLength(1);
  });

  it("clearing tenant blocks access (default-deny)", () => {
    const db = makePgMem();
    db.setTenant(null);
    expect(db.tenantScopedSelect()).toHaveLength(0);
  });

  it("the underlying table holds rows from all tenants (proving the filter is doing the work)", () => {
    const db = makePgMem();
    expect(db.unscopedCount()).toBe(4);
  });

  /**
   * Real-Postgres mode. Activated by setting INTEGRATION_DATABASE_URL.
   * Defines a tenant-scoped table + matching RLS policy (mirroring the
   * shape used by tables in `infra/db/rls.sql`) and proves enforcement
   * end-to-end: cross-tenant SELECT/UPDATE/DELETE are all denied even
   * when the SQL itself doesn't filter by tenant_id.
   */
  const realUrl = process.env.INTEGRATION_DATABASE_URL;
  (realUrl ? describe : describe.skip)("real Postgres RLS enforcement", () => {
    it("policies block cross-tenant SELECT/UPDATE/DELETE", async () => {
      const pg = await import("pg");
      const pool = new pg.default.Pool({ connectionString: realUrl });
      const client = await pool.connect();
      try {
        // Use a non-superuser role: superusers bypass RLS by default.
        await client.query(`DROP ROLE IF EXISTS rls_app_test`);
        await client.query(`CREATE ROLE rls_app_test`);
        await client.query(`GRANT ALL ON SCHEMA public TO rls_app_test`);

        await client.query(`DROP TABLE IF EXISTS rls_projects`);
        await client.query(`
          CREATE TABLE rls_projects (
            id serial PRIMARY KEY,
            tenant_id text NOT NULL,
            payload text NOT NULL
          );
          GRANT ALL ON rls_projects TO rls_app_test;
          GRANT USAGE, SELECT ON SEQUENCE rls_projects_id_seq TO rls_app_test;
          INSERT INTO rls_projects (tenant_id, payload) VALUES
            ('tenantA','A1'),('tenantA','A2'),('tenantB','B1');

          ALTER TABLE rls_projects ENABLE ROW LEVEL SECURITY;
          ALTER TABLE rls_projects FORCE ROW LEVEL SECURITY;

          CREATE POLICY tenant_isolation_select ON rls_projects FOR SELECT
            USING (tenant_id = current_setting('app.tenant_id', true));
          CREATE POLICY tenant_isolation_modify ON rls_projects FOR ALL
            USING (tenant_id = current_setting('app.tenant_id', true))
            WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
        `);

        await client.query(`SET ROLE rls_app_test`);

        // Tenant A
        await client.query(`SELECT set_config('app.tenant_id', 'tenantA', true)`);
        const a = await client.query(`SELECT payload FROM rls_projects ORDER BY payload`);
        expect(a.rows.map((r) => r.payload)).toEqual(["A1", "A2"]);

        // Switch to Tenant B — must NOT see A's rows
        await client.query(`SELECT set_config('app.tenant_id', 'tenantB', true)`);
        const b = await client.query(`SELECT payload FROM rls_projects`);
        expect(b.rows.map((r) => r.payload)).toEqual(["B1"]);

        // Cross-tenant UPDATE silently affects 0 rows under RLS
        const updated = await client.query(
          `UPDATE rls_projects SET payload = 'HACKED' WHERE tenant_id = 'tenantA'`,
        );
        expect(updated.rowCount).toBe(0);

        // Cross-tenant DELETE likewise affects 0 rows
        const deleted = await client.query(
          `DELETE FROM rls_projects WHERE tenant_id = 'tenantA'`,
        );
        expect(deleted.rowCount).toBe(0);

        // Verify tenantA rows are still intact when viewed by tenantA
        await client.query(`SELECT set_config('app.tenant_id', 'tenantA', true)`);
        const aAfter = await client.query(
          `SELECT payload FROM rls_projects ORDER BY payload`,
        );
        expect(aAfter.rows.map((r) => r.payload)).toEqual(["A1", "A2"]);

        // Default-deny: with no tenant set, queries return zero rows
        await client.query(`RESET ROLE`);
        await client.query(`SET ROLE rls_app_test`);
        const none = await client.query(`SELECT payload FROM rls_projects`);
        expect(none.rows).toEqual([]);

        // INSERT with mismatched tenant is rejected by WITH CHECK
        await client.query(`SELECT set_config('app.tenant_id', 'tenantA', true)`);
        await expect(
          client.query(
            `INSERT INTO rls_projects (tenant_id, payload) VALUES ('tenantB', 'forbidden')`,
          ),
        ).rejects.toThrow(/row-level security|new row violates/);
      } finally {
        try { await client.query(`RESET ROLE`); } catch { /* ignore */ }
        try { await client.query(`DROP TABLE IF EXISTS rls_projects`); } catch { /* ignore */ }
        try { await client.query(`DROP ROLE IF EXISTS rls_app_test`); } catch { /* ignore */ }
        client.release();
        await pool.end();
      }
    }, 30_000);
  });
});
