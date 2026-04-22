import { db, agentTasksTable, usersTable, subscriptionsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

export type Tier = "free" | "pro" | "team" | "enterprise";

export interface PlanEntitlements {
  includedCreditsMicroUsd: number;
  maxConcurrentTasks: number;
  allowedModels: string[];
  supportLevel: string;
}

export const TIER_ENTITLEMENTS: Record<Tier, PlanEntitlements> = {
  free: {
    includedCreditsMicroUsd: 1_000_000,
    maxConcurrentTasks: 1,
    allowedModels: ["claude-haiku-4-5"],
    supportLevel: "community",
  },
  pro: {
    includedCreditsMicroUsd: 25_000_000,
    maxConcurrentTasks: 3,
    allowedModels: ["claude-haiku-4-5", "claude-sonnet-4-6"],
    supportLevel: "priority",
  },
  team: {
    includedCreditsMicroUsd: 100_000_000,
    maxConcurrentTasks: 10,
    allowedModels: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-5"],
    supportLevel: "dedicated",
  },
  enterprise: {
    includedCreditsMicroUsd: 500_000_000,
    maxConcurrentTasks: 50,
    allowedModels: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-5"],
    supportLevel: "white-glove",
  },
};

export async function getUserTier(userId: string): Promise<Tier> {
  const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const plan = (user?.plan ?? "free") as string;
  // Enterprise tier is not part of the users.plan enum; surface it via an
  // active subscription with planId === 'enterprise' so admin overrides and
  // self-serve enterprise customers both resolve correctly.
  const [sub] = await db.select({ planId: subscriptionsTable.planId, status: subscriptionsTable.status })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.planId, "enterprise")))
    .limit(1);
  if (sub && (sub.status === "active" || sub.status === "trialing")) return "enterprise";
  if (plan === "team") return "team";
  if (plan === "pro") return "pro";
  return "free";
}

export async function getEntitlements(userId: string): Promise<{ tier: Tier; entitlements: PlanEntitlements }> {
  const tier = await getUserTier(userId);
  return { tier, entitlements: TIER_ENTITLEMENTS[tier] };
}

export async function countActiveTasks(userId: string): Promise<number> {
  const rows = await db.select({ id: agentTasksTable.id }).from(agentTasksTable)
    .where(and(eq(agentTasksTable.userId, userId), inArray(agentTasksTable.state, ["queued", "active"])));
  return rows.length;
}

export interface PreflightResult {
  ok: boolean;
  reason?: string;
  code?: "no_credits" | "model_not_allowed" | "concurrency_limit";
  balance?: number;
  required?: number;
}

import { getBalanceMicroUsd } from "./ledger";

export async function preflight(userId: string, model: string, estimatedCostMicroUsd = 100_000): Promise<PreflightResult> {
  const { tier, entitlements } = await getEntitlements(userId);
  if (!entitlements.allowedModels.includes(model)) {
    return { ok: false, reason: `Model ${model} is not available on the ${tier} plan`, code: "model_not_allowed" };
  }
  const active = await countActiveTasks(userId);
  if (active >= entitlements.maxConcurrentTasks) {
    return { ok: false, reason: `You have reached the concurrent task limit (${entitlements.maxConcurrentTasks})`, code: "concurrency_limit" };
  }
  const balance = await getBalanceMicroUsd(userId);
  if (balance < estimatedCostMicroUsd) {
    return { ok: false, reason: "Out of credits. Please top up to continue.", code: "no_credits", balance, required: estimatedCostMicroUsd };
  }
  return { ok: true, balance };
}
