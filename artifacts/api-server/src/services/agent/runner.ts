import { db, agentTasksTable, agentEventsTable, aiConversationsTable } from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AGENT_TOOLS, dispatchTool, type ToolContext } from "./tools";
import { createCheckpoint } from "./checkpoints";
import { emitAgentEvent, type AgentEventType } from "./realtime";
import { languageInstructionForConversation } from "./lang-detect";

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

async function setState(taskId: string, projectId: string, state: typeof agentTasksTable.$inferSelect.state, extra: Partial<typeof agentTasksTable.$inferInsert> = {}): Promise<void> {
  await db.update(agentTasksTable).set({ state, ...extra }).where(eq(agentTasksTable.id, taskId));
  await appendEvent(taskId, projectId, "state_change", { state });
}

export async function createTask(opts: CreateTaskOptions): Promise<{ taskId: string; conversationId: string }> {
  let conversationId = opts.conversationId;
  if (!conversationId) {
    const [conv] = await db.insert(aiConversationsTable).values({
      userId: opts.userId, projectId: opts.projectId, title: opts.prompt.slice(0, 80), messages: [],
    }).returning();
    conversationId = conv.id;
  }
  const model = TIER_TO_MODEL[opts.tier];
  const [task] = await db.insert(agentTasksTable).values({
    conversationId, projectId: opts.projectId, userId: opts.userId,
    prompt: opts.prompt, mode: opts.mode, tier: opts.tier, model, state: "queued",
  }).returning();
  await appendEvent(task.id, opts.projectId, "user_message", { content: opts.prompt });
  return { taskId: task.id, conversationId };
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

  await setState(taskId, projectId, "active", { startedAt: new Date() });

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
        await setState(taskId, projectId, "cancelled", { completedAt: new Date(), errorMessage: "Cancelled by user" });
        return;
      }

      const response = await anthropic.messages.create({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT + `\n\nMode: ${task.mode}. Project ID: ${projectId}.\n\n${languageInstructionForConversation(task.conversationId, task.prompt)}`,
        tools: AGENT_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as { type: "object" } })),
        messages: messages as any,
      });

      totalIn += response.usage?.input_tokens ?? 0;
      totalOut += response.usage?.output_tokens ?? 0;
      const cost = (totalIn * pricing.in + totalOut * pricing.out) / 1_000_000;
      await db.update(agentTasksTable).set({
        inputTokens: totalIn, outputTokens: totalOut, costUsd: cost, actionCount,
      }).where(eq(agentTasksTable.id, taskId));
      await appendEvent(taskId, projectId, "cost_update", { inputTokens: totalIn, outputTokens: totalOut, costUsd: cost });

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
              await setState(taskId, projectId, "awaiting_approval");
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
    await setState(taskId, projectId, "completed", {
      completedAt: new Date(), result: assistantTextOut, actionCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent run failed";
    await appendEvent(taskId, projectId, "tool_error", { error: msg });
    await setState(taskId, projectId, "failed", { completedAt: new Date(), errorMessage: msg });
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
