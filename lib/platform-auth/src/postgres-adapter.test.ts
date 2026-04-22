/**
 * Verifies the PostgresSessionAdapter against pg-mem (a real PG-syntax
 * SQL engine), exercising the same SessionManager contract used in
 * production. This is the integration-shaped equivalent of the
 * in-memory adapter test, proving the SQL statements parse and behave.
 */
import { describe, it, expect } from "vitest";
import { newDb } from "pg-mem";
import { SessionManager } from "./lucia.js";
import { PostgresSessionAdapter, type PgQueryable } from "./postgres-adapter.js";

async function makeQueryable(): Promise<PgQueryable> {
  const mem = newDb();
  mem.public.none(`
    CREATE TABLE auth_users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      tenant_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE auth_sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      user_id_hash text NOT NULL,
      tenant_id text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  // Use pg-mem's pg-compat adapter so parameter binding ($1,$2,...) works
  // exactly as in real Postgres — the same code path the production
  // adapter exercises.
  const pgAdapter = mem.adapters.createPg();
  const pool = new pgAdapter.Pool();
  return {
    async query(text, params) {
      const r = await pool.query(text, params ? [...params] : []);
      return { rows: (r.rows ?? []) as Array<Record<string, unknown>> };
    },
  };
}

describe("PostgresSessionAdapter", () => {
  it("supports the full signup → signin → validate → signout lifecycle", async () => {
    const adapter = new PostgresSessionAdapter(await makeQueryable());
    const sm = new SessionManager(adapter);

    const u = await sm.signup({
      email: "Alice@Example.COM",
      password: "correct horse battery staple",
      tenantId: "tenantA",
    });
    expect(u.tenantId).toBe("tenantA");

    const { session } = await sm.signin("alice@example.com", "correct horse battery staple");
    expect(session.tenantId).toBe("tenantA");

    const validated = await sm.validate(session.id);
    expect(validated?.userId).toBe(u.id);

    await sm.signout(session.id);
    expect(await sm.validate(session.id)).toBeNull();
  });

  it("rejects duplicate signups", async () => {
    const sm = new SessionManager(new PostgresSessionAdapter(await makeQueryable()));
    await sm.signup({ email: "x@y.io", password: "passpasspass", tenantId: "t1" });
    await expect(
      sm.signup({ email: "x@y.io", password: "passpasspass", tenantId: "t1" }),
    ).rejects.toThrow();
  });

  it("signoutAll deletes every session for a user", async () => {
    const adapter = new PostgresSessionAdapter(await makeQueryable());
    const sm = new SessionManager(adapter);
    const u = await sm.signup({ email: "z@z.io", password: "passpasspass", tenantId: "t" });
    const s1 = await sm.createSession(u);
    const s2 = await sm.createSession(u);
    await sm.signoutAll(u.id);
    expect(await sm.validate(s1.id)).toBeNull();
    expect(await sm.validate(s2.id)).toBeNull();
  });
});
