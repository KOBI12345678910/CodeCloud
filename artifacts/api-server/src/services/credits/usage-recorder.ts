import { db, taskUsageTable, taskCheckpointUsageTable, agentTasksTable } from "@workspace/db";
import { eq, sum, sql } from "drizzle-orm";
import { computeCostMicroUsd, getActivePriceTable, type UsageInput } from "./pricing-engine";

export async function recordUsage(taskId: string, userId: string, stepIndex: number, usage: UsageInput): Promise<{ id: string; costMicroUsd: number; pricingVersion: number }> {
  const { version, table } = await getActivePriceTable();
  const cost = computeCostMicroUsd(usage, table);
  const [row] = await db.insert(taskUsageTable).values({
    taskId, userId, stepIndex, kind: usage.kind,
    model: usage.model ?? null, endpoint: usage.endpoint ?? null,
    inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0,
    cachedInputTokens: usage.cachedInputTokens ?? 0, computeMs: usage.computeMs ?? 0,
    storageDeltaMb: usage.storageDeltaMb ?? 0, costMicroUsd: cost, pricingVersion: version,
  }).returning({ id: taskUsageTable.id });
  await db.update(agentTasksTable).set({
    inputTokens: sql`${agentTasksTable.inputTokens} + ${usage.inputTokens ?? 0}`,
    outputTokens: sql`${agentTasksTable.outputTokens} + ${usage.outputTokens ?? 0}`,
    costUsd: sql`${agentTasksTable.costUsd} + ${cost / 1_000_000}`,
  }).where(eq(agentTasksTable.id, taskId));
  return { id: row.id, costMicroUsd: cost, pricingVersion: version };
}

export async function checkpointUsage(taskId: string, stepIndex: number): Promise<{ id: string; totalCostMicroUsd: number }> {
  const [agg] = await db.select({
    cost: sum(taskUsageTable.costMicroUsd).mapWith(Number),
    inT: sum(taskUsageTable.inputTokens).mapWith(Number),
    outT: sum(taskUsageTable.outputTokens).mapWith(Number),
  }).from(taskUsageTable).where(eq(taskUsageTable.taskId, taskId));
  const total = Number(agg?.cost ?? 0);
  const [row] = await db.insert(taskCheckpointUsageTable).values({
    taskId, stepIndex, totalCostMicroUsd: total, inputTokens: Number(agg?.inT ?? 0), outputTokens: Number(agg?.outT ?? 0),
  }).returning({ id: taskCheckpointUsageTable.id });
  return { id: row.id, totalCostMicroUsd: total };
}

export async function getTaskUsageSummary(taskId: string): Promise<{ rows: typeof taskUsageTable.$inferSelect[]; totalCostMicroUsd: number; totalInputTokens: number; totalOutputTokens: number }> {
  const rows = await db.select().from(taskUsageTable).where(eq(taskUsageTable.taskId, taskId)).orderBy(taskUsageTable.stepIndex);
  const totalCostMicroUsd = rows.reduce((s, r) => s + Number(r.costMicroUsd), 0);
  const totalInputTokens = rows.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = rows.reduce((s, r) => s + r.outputTokens, 0);
  return { rows, totalCostMicroUsd, totalInputTokens, totalOutputTokens };
}
