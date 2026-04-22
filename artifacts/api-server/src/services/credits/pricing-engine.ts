import { db, pricingVersionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export interface PriceTable {
  models: Record<string, { inputPerMTokMicroUsd: number; outputPerMTokMicroUsd: number; cachedInputPerMTokMicroUsd: number }>;
  computeMicroUsdPerSecond: number;
  storageMicroUsdPerGbMonth: number;
  externalApi: Record<string, number>;
  marginBps: number;
}

export const DEFAULT_PRICE_TABLE: PriceTable = {
  models: {
    "claude-haiku-4-5": { inputPerMTokMicroUsd: 1_000_000, outputPerMTokMicroUsd: 5_000_000, cachedInputPerMTokMicroUsd: 100_000 },
    "claude-sonnet-4-6": { inputPerMTokMicroUsd: 3_000_000, outputPerMTokMicroUsd: 15_000_000, cachedInputPerMTokMicroUsd: 300_000 },
    "claude-opus-4-5": { inputPerMTokMicroUsd: 15_000_000, outputPerMTokMicroUsd: 75_000_000, cachedInputPerMTokMicroUsd: 1_500_000 },
  },
  computeMicroUsdPerSecond: 30,
  storageMicroUsdPerGbMonth: 100_000,
  externalApi: {},
  marginBps: 2000,
};

let cached: { version: number; table: PriceTable; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getActivePriceTable(): Promise<{ version: number; table: PriceTable }> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return { version: cached.version, table: cached.table };
  const [row] = await db.select().from(pricingVersionsTable).orderBy(desc(pricingVersionsTable.version)).limit(1);
  if (!row) {
    await db.insert(pricingVersionsTable).values({
      version: 1, prices: DEFAULT_PRICE_TABLE as unknown as object, marginBps: DEFAULT_PRICE_TABLE.marginBps, activatedAt: new Date(),
    }).onConflictDoNothing();
    cached = { version: 1, table: DEFAULT_PRICE_TABLE, at: Date.now() };
    return { version: 1, table: DEFAULT_PRICE_TABLE };
  }
  const table = row.prices as unknown as PriceTable;
  cached = { version: row.version, table, at: Date.now() };
  return { version: row.version, table };
}

export interface UsageInput {
  kind: string;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  computeMs?: number;
  storageDeltaMb?: number;
  endpoint?: string | null;
}

export function computeCostMicroUsd(usage: UsageInput, table: PriceTable): number {
  let cost = 0;
  if (usage.model && table.models[usage.model]) {
    const m = table.models[usage.model];
    cost += ((usage.inputTokens ?? 0) - (usage.cachedInputTokens ?? 0)) * m.inputPerMTokMicroUsd / 1_000_000;
    cost += (usage.cachedInputTokens ?? 0) * m.cachedInputPerMTokMicroUsd / 1_000_000;
    cost += (usage.outputTokens ?? 0) * m.outputPerMTokMicroUsd / 1_000_000;
  }
  if (usage.computeMs) cost += (usage.computeMs / 1000) * table.computeMicroUsdPerSecond;
  if (usage.storageDeltaMb) cost += (usage.storageDeltaMb / 1024) * table.storageMicroUsdPerGbMonth;
  if (usage.endpoint && table.externalApi[usage.endpoint]) cost += table.externalApi[usage.endpoint];
  cost = Math.round(cost * (1 + table.marginBps / 10_000));
  return Math.max(0, cost);
}

export function invalidatePricingCache(): void { cached = null; }
