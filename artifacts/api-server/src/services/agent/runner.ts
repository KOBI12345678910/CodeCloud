import { db, agentTasksTable, agentEventsTable, aiConversationsTable } from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import type Anthropic from "@anthropic-ai/sdk";
type AnthMessageParam = Anthropic.Messages.MessageParam;
type AnthUsage = Anthropic.Messages.Usage & { cache_read_input_tokens?: number };
import { AGENT_TOOLS, dispatchTool, type ToolContext } from "./tools";
import { createCheckpoint } from "./checkpoints";
import { emitAgentEvent, type AgentEventType } from "./realtime";
import { languageInstructionForConversation } from "./lang-detect";
import { recordUsage, checkpointUsage } from "../credits/usage-recorder";
import { reserve, settleReservation, getBalanceMicroUsd } from "../credits/ledger";
import { preflight } from "../credits/entitlements";
import { transition, toDbState, type LifecycleState } from "./lifecycle";
import { db as cdb, aiMessagesTable } from "@workspace/db";

export type AgentTier = "standard" | "power" | "max";
export type AgentMode = "plan" | "build" | "background";

export const TIER_TO_MODEL: Record<AgentTier, string> = {
  standard: "claude-haiku-4-5",
  power: "claude-sonnet-4-6",
  max: "claude-opus-4-5",
};

const TIER_PRICING: Record<AgentTier, { in: number; out: number }> = {
  standard: { in: 1.0, out: 5.0 },
  power: { in: 3.0, out: 15.0 },
  max: { in: 15.0, out: 75.0 },
};

const SYSTEM_PROMPT = `You are an agentic AI senior software engineer working inside a cloud IDE for a specific user project.

Operating principles:
- Read code before editing. Use list_files / read_file before write_file.
- Make small, focused changes. After each change, verify by reading the file or running a relevant command.
- When in plan mode, first emit a structured plan (call no mutating tools) using the "plan" virtual tool by responding with a JSON object {"plan": [{"step": "...", "details": "..."}]} inside a single fenced \`json\` block, then stop and wait for approval.
- When in build mode, execute the changes directly with the available tools.
- Reply in the same language the user used (English, Hebrew, etc.).
- Never echo or leak environment secrets.
- When done, give a short final user-facing summary in markdown.

You have these tools: read_file, write_file, delete_file, list_files, run_shell, install_package, read_db_schema, http_request, preview_screenshot, web_search.`;

const MAX_TURNS = 12;
const MAX_OUTPUT_TOKENS = 4096;

export interface CreateTaskOptions {
  projectId: string;
  userId: string;
  conversationId: string | null;
  prompt: string;
  mode: AgentMode;
  tier: AgentTier;
}

const cancelled = new Set<string>();

export function cancelTask(taskId: string): void {
  cancelled.add(taskId);
}

function isCancelled(taskId: string): boolean {
  return cancelled.has(taskId);
}

async function appendEvent(taskId: string, projectId: string, type: AgentEventType, payload: unknown): Promise<void> {
  const last = await db.select({ seq: agentEventsTable.seq }).from(agentEventsTable)
    .where(eq(agentEventsTable.taskId, taskId)).orderBy(desc(agentEventsTable.seq)).limit(1);
  const seq = (last[0]?.seq ?? 0) + 1;
  await db.insert(agentEventsTable).values({ taskId, seq, type, payload: payload as object });
  emitAgentEvent({ taskId, projectId, seq, type, payload, at: Date.now() });
}

/**
 * Track each task's named lifecycle state in-process (Queued/Planning/Working/
 * Review/Done/Failed/Cancelled) and validate transitions against the explicit
 * state machine in lifecycle.ts. The persisted state column uses the
 * pre-existing 6-value enum, so each named state is mapped via toDbState().
 */
const lifecycleByTask = new Map<string, LifecycleState>();

async function setState(
  taskId: string,
  projectId: string,
  next: LifecycleState,
  extra: Partial<typeof agentTasksTable.$inferInsert> = {},
): Promise<void> {
  const current = lifecycleByTask.get(taskId) ?? "Queued";
  const transitioned = transition(current, next);
  lifecycleByTask.set(taskId, transitioned);
  await db.update(agentTasksTable)
    .set({ state: toDbState(transitioned), ...extra })
    .where(eq(agentTasksTable.id, taskId));
  await appendEvent(taskId, projectId, "state_change", {
    state: toDbState(transitioned),
    lifecycle: transitioned,
  });
}

// Maximum credit reservation per task (USD). Settled down to actual usage on
// completion or failure — anything past actual is released back to the user.
const TIER_RESERVATION_USD: Record<AgentTier, number> = { standard: 1, power: 5, max: 25 };

interface CreateTaskError extends Error { code?: string; balance?: number; }

export async function createTask(opts: CreateTaskOptions): Promise<{ taskId: string; conversationId: string; preflight: { ok: boolean; reason?: string; code?: string; balance?: number } }> {
  const model = TIER_TO_MODEL[opts.tier];
  const reservationMicroUsd = Math.round(TIER_RESERVATION_USD[opts.tier] * 1_000_000);
  const pf = await preflight(opts.userId, model, reservationMicroUsd);
  if (!pf.ok) {
    const err: CreateTaskError = new Error(pf.reason || "Preflight failed");
    err.code = pf.code; err.balance = pf.balance;
    throw err;
  }
  let conversationId = opts.conversationId;
  if (!conversationId) {
    const [conv] = await db.insert(aiConversationsTable).values({
      userId: opts.userId, projectId: opts.projectId, title: opts.prompt.slice(0, 80), messages: [],
    }).returning();
    conversationId = conv.id;
  }
  const [task] = await db.insert(agentTasksTable).values({
    conversationId, projectId: opts.projectId, userId: opts.userId,
    prompt: opts.prompt, mode: opts.mode, tier: opts.tier, model, state: "queued",
  }).returning();
  // Atomic reservation: holds estimated max cost so concurrent tasks cannot
  // overrun the balance. Settled down to actual usage when the task ends.
  const reserveResult = await reserve(opts.userId, reservationMicroUsd, task.id, "Task reservation (hold)");
  if (!reserveResult.ok) {
    await db.delete(agentTasksTable).where(eq(agentTasksTable.id, task.id));
    const err: CreateTaskError = new Error("Insufficient credits to reserve task");
    err.code = "no_credits"; err.balance = reserveResult.balanceMicroUsd;
    throw err;
  }
  await cdb.insert(aiMessagesTable).values({
    conversationId, role: "user", content: opts.prompt, toolCalls: { taskId: task.id } as object,
  });
  await appendEvent(task.id, opts.projectId, "user_message", { content: opts.prompt });
  return { taskId: task.id, conversationId, preflight: { ok: true, balance: pf.balance } };
}

/** Locate the active (un-settled, un-released) reservation ledger row for a task. */
async function findReservationId(taskId: string, userId: string): Promise<string | null> {
  const { creditsLedgerTable } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const rows = await db.select({ id: creditsLedgerTable.id, metadata: creditsLedgerTable.metadata })
    .from(creditsLedgerTable)
    .where(and(
      eq(creditsLedgerTable.taskId, taskId),
      eq(creditsLedgerTable.userId, userId),
      eq(creditsLedgerTable.kind, "task_debit"),
      sql`${creditsLedgerTable.metadata}->>'reservation' = 'true'`,
    ));
  for (const r of rows) {
    const [released] = await db.select({ id: creditsLedgerTable.id })
      .from(creditsLedgerTable)
      .where(sql`${creditsLedgerTable.userId} = ${userId}
        AND (${creditsLedgerTable.metadata}->>'releasesReservation' = ${r.id}
             OR ${creditsLedgerTable.metadata}->>'settlesReservation' = ${r.id})`)
      .limit(1);
    if (!released) return r.id;
  }
  return null;
}

interface AnthMsg {
  role: "user" | "assistant";
  content: unknown;
}

export async function runTask(taskId: string, opts: { approved?: boolean } = {}): Promise<void> {
  const [task] = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, taskId));
  if (!task) return;
  if (task.state === "active") return;
  cancelled.delete(taskId);

  const projectId = task.projectId;
  const tier = task.tier as AgentTier;
  const model = task.model;
  const pricing = TIER_PRICING[tier];

  // Hydrate the in-process lifecycle from the persisted DB state so that a
  // resumed task (e.g. queued -> Review -> approved -> Working) re-uses a
  // valid transition path. Without this, a fresh process always assumes
  // Queued and would reject Review -> Planning on resume.
  const persistedLifecycle: LifecycleState =
    task.state === "awaiting_approval" ? "Review" :
    task.state === "active" ? "Working" :
    task.state === "completed" ? "Done" :
    task.state === "failed" ? "Failed" :
    task.state === "cancelled" ? "Cancelled" :
    "Queued";
  lifecycleByTask.set(taskId, persistedLifecycle);

  if (persistedLifecycle === "Review" && opts.approved) {
    // Resuming an approved plan: skip Planning and go straight to Working.
    await setState(taskId, projectId, "Working");
  } else if (persistedLifecycle === "Queued") {
    await setState(taskId, projectId, "Planning", { startedAt: new Date() });
    await setState(taskId, projectId, "Working");
  } else {
    // Already Planning/Working from a prior resume — just ensure DB row state.
    await setState(taskId, projectId, "Working");
  }

  // If the prior phase settled the original reservation (e.g. plan-mode
  // pause for review), re-reserve credits for this run so resumed work is
  // again capped against balance and held atomically.
  {
    const existing = await findReservationId(taskId, task.userId);
    if (!existing) {
      const reservationMicroUsd = Math.round(TIER_RESERVATION_USD[tier] * 1_000_000);
      const r = await reserve(task.userId, reservationMicroUsd, taskId, "Task reservation (resume)");
      if (!r.ok) {
        await setState(taskId, projectId, "Failed", {
          completedAt: new Date(),
          errorMessage: "Insufficient credits to resume task",
        });
        await appendEvent(taskId, projectId, "tool_error", {
          error: "no_credits", balanceUsd: r.balanceMicroUsd / 1_000_000,
        });
        return;
      }
    }
  }

  const conv = task.conversationId
    ? (await db.select().from(aiConversationsTable).where(eq(aiConversationsTable.id, task.conversationId)))[0]
    : null;
  const history: AnthMsg[] = ((conv?.messages as { role: "user" | "assistant"; content: string }[]) || [])
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content }));

  const ctx: ToolContext = { projectId, userId: task.userId, mode: task.mode as AgentMode, approved: opts.approved ?? task.mode !== "plan" };

  const messages: AnthMsg[] = [...history, { role: "user", content: task.prompt }];

  let totalIn = task.inputTokens;
  let totalOut = task.outputTokens;
  let actionCount = task.actionCount;
  let assistantTextOut = "";
  let stepIndex = 0;
  let consumedMicroUsd = 0;
  let lastCheckpointMicroUsd = 0;
  const totalReservedMicroUsd = Math.round(TIER_RESERVATION_USD[tier] * 1_000_000);

  let cpTimer: NodeJS.Timeout | null = null;
  if (task.mode !== "plan") {
    cpTimer = setInterval(() => {
      createCheckpoint(taskId, projectId, `auto @ ${new Date().toISOString()}`).then((id) => {
        appendEvent(taskId, projectId, "checkpoint", { checkpointId: id, label: "auto" });
      }).catch(() => {});
    }, 30_000);
  }

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (isCancelled(taskId)) {
        // Settle the reservation against work consumed so far. The unused
        // portion is released by settleReservation's positive refund row,
        // so cancelled tasks do not leak credits.
        const reservationId = await findReservationId(taskId, task.userId);
        const out = await settleReservation(task.userId, reservationId, consumedMicroUsd, taskId, "Task cancelled");
        const refundedMicroUsd = Math.max(0, totalReservedMicroUsd - consumedMicroUsd);
        await appendEvent(taskId, projectId, "cost_update", {
          ledgerDebitedUsd: consumedMicroUsd / 1_000_000,
          refundedUsd: refundedMicroUsd / 1_000_000,
          balanceUsd: out.balanceAfterMicroUsd / 1_000_000,
          final: true,
        });
        await setState(taskId, projectId, "Cancelled", { completedAt: new Date(), errorMessage: "Cancelled by user" });
        if (cpTimer) clearInterval(cpTimer);
        cancelled.delete(taskId);
        return;
      }

      const response = await anthropic.messages.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT + `\n\nMode: ${task.mode}. Project ID: ${projectId}.\n\n${languageInstructionForConversation(task.conversationId, task.prompt)}`,
        tools: AGENT_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as { type: "object" } })),
        messages: messages as AnthMessageParam[],
      });

      const usage = response.usage as AnthUsage | undefined;
      const stepInput = usage?.input_tokens ?? 0;
      const stepOutput = usage?.output_tokens ?? 0;
      const stepCachedInput = usage?.cache_read_input_tokens ?? 0;
      totalIn += stepInput;
      totalOut += stepOutput;
      stepIndex++;
      const usageRow = await recordUsage(taskId, task.userId, stepIndex, {
        kind: "model_call", model,
        inputTokens: stepInput, outputTokens: stepOutput, cachedInputTokens: stepCachedInput,
      });
      consumedMicroUsd += usageRow.costMicroUsd;
      const cpRow = await checkpointUsage(taskId, stepIndex);
      lastCheckpointMicroUsd = cpRow.totalCostMicroUsd;
      await db.update(agentTasksTable).set({ actionCount }).where(eq(agentTasksTable.id, taskId));
      await appendEvent(taskId, projectId, "cost_update", {
        inputTokens: totalIn, outputTokens: totalOut, costUsd: lastCheckpointMicroUsd / 1_000_000,
        stepIndex, stepCostUsd: usageRow.costMicroUsd / 1_000_000, pricingVersion: usageRow.pricingVersion,
      });

      const blocks = response.content as Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown>; id?: string }>;
      const textParts = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      const toolUses = blocks.filter((b) => b.type === "tool_use");

      if (textParts) {
        assistantTextOut = (assistantTextOut + "\n\n" + textParts).trim();
        await appendEvent(taskId, projectId, "assistant_message", { content: textParts });

        if (task.mode === "plan" && !ctx.approved) {
          const planMatch = textParts.match(/```json\s*([\s\S]*?)```/i);
          if (planMatch) {
            try {
              const plan = JSON.parse(planMatch[1]);
              await db.update(agentTasksTable).set({ plan }).where(eq(agentTasksTable.id, taskId));
              await appendEvent(taskId, projectId, "plan", plan);
              // Settle the reservation against work consumed during planning
              // so first-run usage is billed even if the user never approves
              // the plan. Held reservation is released; on approval the
              // resume will re-reserve for the next phase.
              {
                const reservationId = await findReservationId(taskId, task.userId);
                const out = await settleReservation(task.userId, reservationId, consumedMicroUsd, taskId, "Plan paused for review");
                await appendEvent(taskId, projectId, "cost_update", {
                  ledgerDebitedUsd: consumedMicroUsd / 1_000_000,
                  balanceUsd: out.balanceAfterMicroUsd / 1_000_000,
                  pausedForReview: true,
                });
              }
              await setState(taskId, projectId, "Review");
              if (cpTimer) clearInterval(cpTimer);
              return;
            } catch { /* fall through */ }
          }
        }
      }

      if (toolUses.length === 0) {
        break;
      }

      messages.push({ role: "assistant", content: blocks });

      const toolResults: { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }[] = [];
      for (const tu of toolUses) {
        actionCount++;
        await appendEvent(taskId, projectId, "tool_call", { name: tu.name, input: tu.input, id: tu.id });
        const out = await dispatchTool(tu.name ?? "", tu.input ?? {}, ctx);
        if (out.ok) {
          await appendEvent(taskId, projectId, "tool_result", { id: tu.id, name: tu.name, result: out.result });
          toolResults.push({ type: "tool_result", tool_use_id: tu.id ?? "", content: JSON.stringify(out.result).slice(0, 8000) });
        } else {
          await appendEvent(taskId, projectId, "tool_error", { id: tu.id, name: tu.name, error: out.error });
          toolResults.push({ type: "tool_result", tool_use_id: tu.id ?? "", content: out.error ?? "tool failed", is_error: true });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    if (task.conversationId) {
      const [c] = await db.select().from(aiConversationsTable).where(eq(aiConversationsTable.id, task.conversationId));
      if (c) {
        const msgs = (c.messages as { role: string; content: string }[]) || [];
        msgs.push({ role: "user", content: task.prompt });
        msgs.push({ role: "assistant", content: assistantTextOut || "(no response)" });
        await db.update(aiConversationsTable).set({
          messages: msgs,
          tokenCount: { input: totalIn, output: totalOut },
        }).where(eq(aiConversationsTable.id, task.conversationId));
      }
    }

    if (task.mode !== "plan") {
      const finalCp = await createCheckpoint(taskId, projectId, "Saved progress at the end of the loop", true);
      await appendEvent(taskId, projectId, "checkpoint", { checkpointId: finalCp, label: "final", isFinal: true });
    }
    {
      // Settle the reservation down to actual usage; releases unused credits.
      const reservationId = await findReservationId(taskId, task.userId);
      const out = await settleReservation(task.userId, reservationId, consumedMicroUsd, taskId, "Task completed");
      await appendEvent(taskId, projectId, "cost_update", {
        ledgerDebitedUsd: consumedMicroUsd / 1_000_000, balanceUsd: out.balanceAfterMicroUsd / 1_000_000, final: true,
      });
    }
    await db.insert(aiMessagesTable).values({
      conversationId: task.conversationId!, role: "assistant", content: assistantTextOut || "(no response)",
      toolCalls: { taskId } as object,
    }).catch(() => {});
    await setState(taskId, projectId, "Done", {
      completedAt: new Date(), result: assistantTextOut, actionCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent run failed";
    await appendEvent(taskId, projectId, "tool_error", { error: msg });
    {
      // On failure: settle the reservation to the last successful checkpoint.
      // Anything consumed past the checkpoint is auto-refunded by virtue of
      // not being charged, and the unused reservation is released.
      const charge = Math.min(consumedMicroUsd, lastCheckpointMicroUsd);
      const reservationId = await findReservationId(taskId, task.userId);
      const out = await settleReservation(task.userId, reservationId, charge, taskId, "Partial work consumed before failure");
      const refundedMicroUsd = Math.max(0, consumedMicroUsd - charge);
      await appendEvent(taskId, projectId, "cost_update", {
        ledgerDebitedUsd: charge / 1_000_000,
        refundedUsd: refundedMicroUsd / 1_000_000,
        balanceUsd: out.balanceAfterMicroUsd / 1_000_000,
        final: true,
      });
    }
    await setState(taskId, projectId, "Failed", { completedAt: new Date(), errorMessage: msg });
  } finally {
    if (cpTimer) clearInterval(cpTimer);
    cancelled.delete(taskId);
  }
}

export async function listTaskEvents(taskId: string, sinceSeq = 0): Promise<{ id: string; seq: number; type: string; payload: unknown; createdAt: Date }[]> {
  const rows = await db.select().from(agentEventsTable)
    .where(and(eq(agentEventsTable.taskId, taskId)))
    .orderBy(asc(agentEventsTable.seq));
  return rows.filter((r) => r.seq > sinceSeq).map((r) => ({
    id: r.id, seq: r.seq, type: r.type, payload: r.payload, createdAt: r.createdAt,
  }));
}
