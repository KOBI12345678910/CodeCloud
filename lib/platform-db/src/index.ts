export * from "./schema/index.js";
export * from "./rls.js";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

export interface CreateClientOptions {
  url: string;
  max?: number;
}

export function createDbClient<TSchema extends Record<string, unknown>>(
  opts: CreateClientOptions,
  schema?: TSchema,
): { pool: pg.Pool; db: NodePgDatabase<TSchema> } {
  const pool = new pg.Pool({ connectionString: opts.url, max: opts.max ?? 10 });
  const db = drizzle(pool, { schema: schema ?? ({} as TSchema) });
  return { pool, db };
}
