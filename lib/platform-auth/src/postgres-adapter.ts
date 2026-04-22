/**
 * Postgres-backed implementation of `SessionAdapter`. Uses a thin
 * `pg`-style interface (anything with `query(text, params)` returning
 * `{ rows }`) so callers can pass either a `pg.Pool`, a `pg.PoolClient`,
 * or a Drizzle/Knex shim.
 *
 * Schema (run as a migration):
 *
 *   CREATE TABLE auth_users (
 *     id text PRIMARY KEY,
 *     email text UNIQUE NOT NULL,
 *     password_hash text NOT NULL,
 *     tenant_id text NOT NULL,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE TABLE auth_sessions (
 *     id text PRIMARY KEY,
 *     user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 *     user_id_hash text NOT NULL,
 *     tenant_id text NOT NULL,
 *     expires_at timestamptz NOT NULL,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX auth_sessions_user_id_idx ON auth_sessions (user_id);
 */
import type { SessionAdapter, User, SessionRecord } from "./lucia.js";

export interface PgQueryable {
  query(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
}

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: String(r.id),
    email: String(r.email),
    passwordHash: String(r.password_hash),
    tenantId: String(r.tenant_id),
    createdAt: new Date(String(r.created_at)),
  };
}

function rowToSession(r: Record<string, unknown>): SessionRecord {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    userIdHash: String(r.user_id_hash),
    tenantId: String(r.tenant_id),
    expiresAt: new Date(String(r.expires_at)),
    createdAt: new Date(String(r.created_at)),
  };
}

export class PostgresSessionAdapter implements SessionAdapter {
  constructor(private readonly db: PgQueryable) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const r = await this.db.query(
      `SELECT id, email, password_hash, tenant_id, created_at FROM auth_users WHERE email = $1`,
      [email.toLowerCase()],
    );
    return r.rows[0] ? rowToUser(r.rows[0]) : null;
  }

  async insertUser(u: User): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_users (id, email, password_hash, tenant_id, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [u.id, u.email.toLowerCase(), u.passwordHash, u.tenantId, u.createdAt],
    );
  }

  async findSession(id: string): Promise<SessionRecord | null> {
    const r = await this.db.query(
      `SELECT id, user_id, user_id_hash, tenant_id, expires_at, created_at
       FROM auth_sessions WHERE id = $1`,
      [id],
    );
    return r.rows[0] ? rowToSession(r.rows[0]) : null;
  }

  async insertSession(s: SessionRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_sessions (id, user_id, user_id_hash, tenant_id, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.id, s.userId, s.userIdHash, s.tenantId, s.expiresAt, s.createdAt],
    );
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.query(`DELETE FROM auth_sessions WHERE id = $1`, [id]);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.query(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);
  }
}
