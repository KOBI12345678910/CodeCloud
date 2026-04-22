import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export interface SecretRef {
  projectId: string;
  key: string;
}

export interface SecretRecord extends SecretRef {
  value: string;
  updatedAt: Date;
}

export interface SecretVault {
  get(ref: SecretRef): Promise<string | null>;
  set(ref: SecretRef, value: string): Promise<void>;
  delete(ref: SecretRef): Promise<void>;
  list(projectId: string): Promise<Array<Omit<SecretRecord, "value">>>;
}

const ALGO = "aes-256-gcm";

export function deriveKey(passphrase: string, salt = "platform-secrets-salt"): Buffer {
  return scryptSync(passphrase, salt, 32);
}

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string, key: Buffer): string {
  const [ivB64, tagB64, encB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Invalid ciphertext payload");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** In-memory implementation, intended for tests and dev. */
export class InMemorySecretVault implements SecretVault {
  private readonly store = new Map<string, SecretRecord>();
  private readonly key: Buffer;

  constructor(passphrase: string) {
    this.key = deriveKey(passphrase);
  }

  private k(ref: SecretRef) {
    return `${ref.projectId}::${ref.key}`;
  }

  async get(ref: SecretRef): Promise<string | null> {
    const rec = this.store.get(this.k(ref));
    return rec ? decrypt(rec.value, this.key) : null;
  }

  async set(ref: SecretRef, value: string): Promise<void> {
    this.store.set(this.k(ref), {
      ...ref,
      value: encrypt(value, this.key),
      updatedAt: new Date(),
    });
  }

  async delete(ref: SecretRef): Promise<void> {
    this.store.delete(this.k(ref));
  }

  async list(projectId: string): Promise<Array<Omit<SecretRecord, "value">>> {
    return Array.from(this.store.values())
      .filter((r) => r.projectId === projectId)
      .map(({ value: _value, ...rest }) => rest);
  }
}

/**
 * Postgres-backed vault. Caller provides a query executor so we don't bind to a
 * specific driver. Expects a table created by infra/db/secrets.sql.
 */
export interface PgQueryFn {
  <T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export class PgSecretVault implements SecretVault {
  private readonly key: Buffer;
  constructor(
    private readonly query: PgQueryFn,
    passphrase: string,
  ) {
    this.key = deriveKey(passphrase);
  }

  async get(ref: SecretRef): Promise<string | null> {
    const { rows } = await this.query<{ value: string }>(
      "SELECT value FROM secrets WHERE project_id = $1 AND key = $2 LIMIT 1",
      [ref.projectId, ref.key],
    );
    return rows[0] ? decrypt(rows[0].value, this.key) : null;
  }

  async set(ref: SecretRef, value: string): Promise<void> {
    const enc = encrypt(value, this.key);
    await this.query(
      `INSERT INTO secrets (project_id, key, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (project_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [ref.projectId, ref.key, enc],
    );
  }

  async delete(ref: SecretRef): Promise<void> {
    await this.query("DELETE FROM secrets WHERE project_id = $1 AND key = $2", [
      ref.projectId,
      ref.key,
    ]);
  }

  async list(projectId: string): Promise<Array<Omit<SecretRecord, "value">>> {
    const { rows } = await this.query<{ key: string; updated_at: Date }>(
      "SELECT key, updated_at FROM secrets WHERE project_id = $1 ORDER BY key",
      [projectId],
    );
    return rows.map((r) => ({ projectId, key: r.key, updatedAt: new Date(r.updated_at) }));
  }
}
